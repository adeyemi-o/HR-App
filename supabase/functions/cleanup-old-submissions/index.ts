import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Calculate 3-month cutoff date
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        console.log(`[Cleanup] Starting for applicants older than ${threeMonthsAgo.toISOString()}`);

        // 1. Find old applicants that should be archived
        // EXCLUDE: Hired, Offer statuses (keep permanently)
        const { data: oldApplicants, error: selectError } = await supabase
            .from('applicants')
            .select('*, offers(*)')
            .lt('created_at', threeMonthsAgo.toISOString())
            .not('status', 'in', '(Hired,Offer)');

        if (selectError) {
            console.error('[Cleanup] Failed to select old applicants:', selectError);
            throw selectError;
        }

        if (!oldApplicants || oldApplicants.length === 0) {
            console.log('[Cleanup] No old applicants to archive');
            return new Response(
                JSON.stringify({
                    success: true,
                    archived: 0,
                    message: 'No old applicants to purge',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[Cleanup] Found ${oldApplicants.length} applicants to archive`);

        // 2. Archive applicants
        const applicantsToArchive = oldApplicants.map(app => ({
            id: app.id,
            airtable_id: app.airtable_id,
            jotform_id: app.jotform_id,
            first_name: app.first_name,
            last_name: app.last_name,
            email: app.email,
            phone: app.phone,
            position_applied: app.position_applied,
            status: app.status,
            resume_url: app.resume_url,
            wp_user_id: app.wp_user_id,
            created_at: app.created_at,
            updated_at: app.updated_at,
            archived_at: new Date().toISOString(),
            archive_reason: '3-month retention policy',
        }));

        const { error: archiveError } = await supabase
            .from('applicants_archive')
            .insert(applicantsToArchive);

        if (archiveError) {
            console.error('[Cleanup] Failed to archive applicants:', archiveError);
            throw archiveError;
        }

        console.log(`[Cleanup] Archived ${applicantsToArchive.length} applicants`);

        // 3. Archive related offers (before cascade deletion)
        const offersToArchive: any[] = [];
        oldApplicants.forEach(app => {
            if (app.offers && Array.isArray(app.offers)) {
                app.offers.forEach((offer: any) => {
                    offersToArchive.push({
                        id: offer.id,
                        applicant_id: offer.applicant_id,
                        status: offer.status,
                        position_title: offer.position_title,
                        start_date: offer.start_date,
                        salary: offer.salary,
                        offer_letter_url: offer.offer_letter_url,
                        secure_token: offer.secure_token,
                        created_by: offer.created_by,
                        created_at: offer.created_at,
                        updated_at: offer.updated_at,
                        expires_at: offer.expires_at,
                        signed_at: offer.signed_at,
                        archived_at: new Date().toISOString(),
                        archive_reason: 'applicant archived',
                    });
                });
            }
        });

        if (offersToArchive.length > 0) {
            const { error: offersArchiveError } = await supabase
                .from('offers_archive')
                .insert(offersToArchive);

            if (offersArchiveError) {
                console.error('[Cleanup] Failed to archive offers:', offersArchiveError);
                throw offersArchiveError;
            }

            console.log(`[Cleanup] Archived ${offersToArchive.length} related offers`);
        }

        // 4. Delete applicants (offers will cascade delete)
        const applicantIds = oldApplicants.map(app => app.id);
        const { error: deleteError } = await supabase
            .from('applicants')
            .delete()
            .in('id', applicantIds);

        if (deleteError) {
            console.error('[Cleanup] Failed to delete applicants:', deleteError);
            throw deleteError;
        }

        console.log(`[Cleanup] Deleted ${applicantIds.length} applicants from main table`);

        // 5. Log to ai_logs for monitoring
        await supabase.from('ai_logs').insert({
            feature: 'data_retention_cleanup',
            success: true,
            metadata: {
                archived_applicants: applicantsToArchive.length,
                archived_offers: offersToArchive.length,
                cutoff_date: threeMonthsAgo.toISOString(),
            },
        });

        return new Response(
            JSON.stringify({
                success: true,
                archived_applicants: applicantsToArchive.length,
                archived_offers: offersToArchive.length,
                cutoff_date: threeMonthsAgo.toISOString(),
                message: `Successfully archived and purged ${applicantsToArchive.length} old applicants`,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('[Cleanup] Error:', error);

        // Log failure to ai_logs
        try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            await supabase.from('ai_logs').insert({
                feature: 'data_retention_cleanup',
                success: false,
                metadata: {
                    error: error instanceof Error ? error.message : String(error),
                },
            });
        } catch (logError) {
            console.error('[Cleanup] Failed to log error:', logError);
        }

        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
