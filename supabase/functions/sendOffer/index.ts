import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { render } from "npm:@react-email/render@0.0.7";
import * as React from "npm:react@18.3.1";
import { OfferEmail } from "../_shared/emails/OfferEmail.tsx";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Create client with Auth context to validate user
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 2. Validate User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // 3. Initialize Admin Client for Database Operations
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (!serviceRoleKey) {
            throw new Error('Service role key not found')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey
        )

        const body = await req.json()
        console.log("Request Body:", body)

        const { jotformSubmissionId, position, salary, startDate, email, firstName, lastName } = body

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email is required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 4. Check/Create Applicant (Using Admin Client)
        // Try to find by JotForm ID first (most reliable)
        let query = supabaseAdmin
            .from('applicants')
            .select('id')
            .eq('airtable_id', jotformSubmissionId)
            .maybeSingle()

        let { data: applicant, error: fetchError } = await query

        // If not found by ID, try by Email (fallback)
        if (!applicant && !fetchError) {
            ({ data: applicant, error: fetchError } = await supabaseAdmin
                .from('applicants')
                .select('id')
                .eq('email', email)
                .maybeSingle())
        }

        if (fetchError) {
            console.error("Fetch Error:", fetchError)
            throw new Error(`Failed to fetch applicant: ${fetchError.message}`)
        }

        let applicantId = applicant?.id

        if (!applicantId) {
            console.log("Applicant not found, creating new one...")
            const { data: newApplicant, error: createError } = await supabaseAdmin
                .from('applicants')
                .insert({
                    email: email,
                    first_name: firstName,
                    last_name: lastName,
                    position_applied: position,
                    status: 'Offer',
                    airtable_id: jotformSubmissionId
                })
                .select('id')
                .single()

            if (createError) {
                console.error("Create Applicant Error:", createError)
                if (createError.code === '23505') {
                    throw new Error(`Applicant creation failed: Duplicate entry. Details: ${createError.message}`)
                }
                throw new Error(`Failed to create applicant: ${createError.message}`)
            }
            applicantId = newApplicant.id
        } else {
            console.log("Applicant found:", applicantId)
            // Update details to ensure they are current (e.g. if name/email was missing before)
            const { error: updateError } = await supabaseAdmin
                .from('applicants')
                .update({
                    status: 'Offer',
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    // Ensure airtable_id is set if we found by email but ID was missing
                    airtable_id: jotformSubmissionId
                })
                .eq('id', applicantId)

            if (updateError) console.error("Update Status Error:", updateError)
        }

        // 5. Create Offer Record (Using Admin Client)
        console.log("Creating offer for:", applicantId)
        const { data: offer, error: offerError } = await supabaseAdmin
            .from('offers')
            .insert({
                applicant_id: applicantId,
                position_title: position,
                salary: salary,
                start_date: startDate,
                status: 'Pending_Approval',
                secure_token: crypto.randomUUID(),
                created_by: user.id // Track who created it
            })
            .select()
            .single()

        if (offerError) {
            console.error("Create Offer Error:", offerError)
            throw new Error(`Failed to create offer: ${offerError.message}`)
        }

        // 6. Send Email via Brevo (Using Settings)
        const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'brevo_api_key')
            .single()

        const BREVO_API_KEY = settingsData?.value

        if (BREVO_API_KEY) {
            console.log(`Sending email to ${email} via Brevo...`)
            const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: {
                        name: 'Prolific Homecare HR',
                        email: 'admin@prolifichcs.com'
                    },
                    to: [{ email: email, name: `${firstName} ${lastName}` }],
                    subject: `Job Offer: ${position} at Prolific Homecare`,
                    htmlContent: await render(
                        React.createElement(OfferEmail, {
                            applicantName: `${firstName} ${lastName}`,
                            position: position,
                            startDate: startDate,
                            salary: `$${salary}`,
                            offerUrl: `https://prolific-hr.com/offers/${offer.secure_token}`
                        })
                    )
                })
            })

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text()
                console.error('Brevo API Error:', errorText)
                // We don't throw here to avoid failing the whole request if just email fails, 
                // but we log it. The offer is already created.
            } else {
                console.log('Email sent successfully via Brevo')
            }
        } else {
            console.warn('BREVO_API_KEY not found in settings, skipping email send.')
        }

        return new Response(JSON.stringify({ success: true, offer }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error("General Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
