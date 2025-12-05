import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { JotFormClient, mapSubmissionToApplicant } from '../_shared/jotform-client.ts'
import { migrateFileToStorage, isJotFormFileUrl } from '../_shared/file-manager.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Fetch Settings
        const { data: settingsData, error: settingsError } = await supabase
            .from('settings')
            .select('key, value')

        if (settingsError) throw new Error(`Failed to fetch settings: ${settingsError.message}`)

        const config = settingsData?.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value
            return acc
        }, {}) || {}

        const JOTFORM_API_KEY = config['jotform_api_key']
        if (!JOTFORM_API_KEY) {
            throw new Error('Missing JOTFORM_API_KEY in settings')
        }

        const FORM_ID = config['jotform_form_id_application']
        if (!FORM_ID) {
            throw new Error('Missing Application Form ID in settings')
        }

        // Initialize JotForm client with retry logic and error handling
        const jotformClient = new JotFormClient(
            JOTFORM_API_KEY,
            supabaseUrl,
            supabaseServiceKey
        )

        // Fetch submissions using the new client (includes retry logic)
        const submissions = await jotformClient.getFormSubmissions(FORM_ID, {
            limit: 100,
            orderby: 'created_at'
        })

        // Fetch existing applicants from DB to preserve status and link by email
        const { data: existingApplicants } = await supabase
            .from('applicants')
            .select('id, status, jotform_id, email, resume_url')

        const jotformIdMap = new Map() // Map jotform_id -> { id, status, resume_url }
        const emailMap = new Map()  // Map email -> { id, status, jotform_id, resume_url }

        if (existingApplicants) {
            existingApplicants.forEach((app: any) => {
                if (app.jotform_id) {
                    jotformIdMap.set(app.jotform_id, { id: app.id, status: app.status, resume_url: app.resume_url })
                }
                if (app.email) {
                    emailMap.set(app.email.toLowerCase(), app)
                }
            })
        }

        // Map submissions to applicant data using the helper function (async for file migration)
        const applicants = await Promise.all(submissions.map(async (submission: any) => {
            // Use the new mapping function for consistency
            const baseData = mapSubmissionToApplicant(submission)

            // Check if this applicant already has a migrated file
            const existingRecord = jotformIdMap.get(baseData.jotform_id) ||
                (baseData.email ? emailMap.get(baseData.email.toLowerCase()) : null)

            // Only migrate if resume_url is a JotForm URL and hasn't been migrated yet
            if (baseData.resume_url && isJotFormFileUrl(baseData.resume_url)) {
                // Skip if existing record already has a non-JotForm URL (already migrated)
                if (existingRecord?.resume_url && !isJotFormFileUrl(existingRecord.resume_url)) {
                    baseData.resume_url = existingRecord.resume_url
                    console.log(`[listApplicants] Skipping migration - already migrated: ${baseData.email}`)
                } else {
                    console.log(`[listApplicants] Migrating file for applicant: ${baseData.email}`)
                    const migrationResult = await migrateFileToStorage(
                        baseData.resume_url,
                        baseData.jotform_id,
                        supabase
                    )

                    if (migrationResult.success && migrationResult.storageUrl) {
                        baseData.resume_url = migrationResult.storageUrl
                        console.log(`[listApplicants] File migrated: ${migrationResult.storageUrl}`)
                    } else {
                        console.warn(`[listApplicants] File migration failed: ${migrationResult.error}`)
                        // Keep original JotForm URL as fallback
                    }
                }
            }

            // 1. Try to find existing record by JotForm ID (Primary match)
            let existingMatch = jotformIdMap.get(baseData.jotform_id)
            let existingId = existingMatch?.id;
            let existingStatus = existingMatch?.status;

            // 2. If not found, try to find by Email (Secondary match - for migration)
            if (!existingId && baseData.email) {
                const match = emailMap.get(baseData.email.toLowerCase())
                if (match) {
                    existingStatus = match.status
                    existingId = match.id // Found the UUID!
                }
            }

            // Determine status
            const ALLOWED_STATUSES = ['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
            const status = existingStatus || 'New';

            // Construct payload combining base data with existing record info
            const payload: any = {
                ...baseData,
                status: ALLOWED_STATUSES.includes(status) ? status : 'New',
                created_at: submission.created_at,
            };

            // If we found an existing UUID (via email match or jotform_id match), include it to force an update
            if (existingId) {
                payload.id = existingId;
            }

            return payload;
        }));

        // Deduplicate by email to prevent unique constraint violations
        // If multiple submissions have the same email, we keep the one that is already linked (has ID)
        // or the first one we encounter (assuming JotForm returns newest first?)
        // Actually, let's explicitly handle it.
        const uniqueApplicantsMap = new Map();

        applicants.forEach((app: any) => {
            if (!app.email) return; // Skip if no email (shouldn't happen given logic, but safe)

            const email = app.email.toLowerCase().trim();
            const existing = uniqueApplicantsMap.get(email);

            if (!existing) {
                uniqueApplicantsMap.set(email, app);
            } else {
                // Conflict! We have two submissions with same email.
                // Priority:
                // 1. Record with ID (already in DB) wins.
                // 2. If both have ID (same ID), doesn't matter.
                // 3. If neither has ID, keep the one we already have (assuming order is meaningful) 
                //    OR check created_at?

                if (app.id && !existing.id) {
                    uniqueApplicantsMap.set(email, app); // Prefer the one that links to DB
                }
                // Else keep existing.
            }
        });

        const uniqueApplicants = Array.from(uniqueApplicantsMap.values());

        // Split into two batches
        const updates = uniqueApplicants.filter((a: any) => a.id);
        const inserts = uniqueApplicants.filter((a: any) => !a.id);

        let allUpsertedData: any[] = [];

        // 1. Process Updates (Match by ID)
        if (updates.length > 0) {
            const { data: updatedData, error: updateError } = await supabase
                .from('applicants')
                .upsert(updates, { onConflict: 'id' })
                .select()

            if (updateError) {
                console.error('Failed to update applicants:', updateError)
                throw new Error(`Failed to update applicants: ${updateError.message}`)
            }
            if (updatedData) allUpsertedData = [...allUpsertedData, ...updatedData];
        }

        // 2. Process Inserts (Match by JotForm ID)
        if (inserts.length > 0) {
            const { data: insertedData, error: insertError } = await supabase
                .from('applicants')
                .upsert(inserts, { onConflict: 'jotform_id' })
                .select()

            if (insertError) {
                console.error('Failed to insert applicants:', insertError)
                throw new Error(`Failed to insert applicants: ${insertError.message}`)
            }
            if (insertedData) allUpsertedData = [...allUpsertedData, ...insertedData];
        }

        return new Response(JSON.stringify(allUpsertedData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
