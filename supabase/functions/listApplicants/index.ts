import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const JOTFORM_API_KEY = Deno.env.get('JOTFORM_API_KEY')
        if (!JOTFORM_API_KEY) {
            throw new Error('Missing JOTFORM_API_KEY')
        }

        // Form ID for "Application Form"
        const FORM_ID = '241904161216448'

        const response = await fetch(`https://api.jotform.com/form/${FORM_ID}/submissions?apiKey=${JOTFORM_API_KEY}&limit=100`, {
            method: 'GET',
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`JotForm API error: ${response.status} ${errorText}`)
        }

        const data = await response.json()

        if (data.responseCode !== 200) {
            throw new Error(`JotForm returned error code: ${data.responseCode} - ${data.message}`)
        }

        // Transform data to a cleaner format
        // JotForm answers are in `answers` object, keyed by question ID.
        // We need to map these IDs to readable fields.
        // Note: You might need to inspect the actual response to get correct QIDs.
        // For now, I will map common fields based on standard JotForm structure, 
        // but we might need to adjust QIDs after testing.

        const applicants = data.content.map((submission: any) => {
            // Helper to find answer by checking values or specific QIDs if known
            // This is a generic mapping strategy. 
            // Ideally, we should know QIDs: e.g., q3_fullName, q4_email

            const answers = submission.answers || {};

            // Attempt to extract fields. 
            // We look for 'name', 'email', 'phoneNumber', 'position' in the answer types or names
            let firstName = '';
            let lastName = '';
            let email = '';
            let phone = '';
            let position = '';
            let resumeUrl = '';

            Object.values(answers).forEach((ans: any) => {
                if (ans.name === 'fullName' || ans.type === 'control_fullname') {
                    firstName = ans.answer?.first || '';
                    lastName = ans.answer?.last || '';
                }
                if (ans.name === 'email' || ans.type === 'control_email') {
                    email = ans.answer || '';
                }
                if (ans.name === 'phoneNumber' || ans.type === 'control_phone') {
                    phone = ans.answer?.full || ans.answer || '';
                }
                if (ans.name === 'positionApplied' || ans.text?.toLowerCase().includes('position')) {
                    position = ans.answer || '';
                }
                if (ans.name === 'uploadResume' || ans.text?.toLowerCase().includes('resume')) {
                    resumeUrl = ans.answer ? (Array.isArray(ans.answer) ? ans.answer[0] : ans.answer) : '';
                }
            });

            return {
                id: submission.id, // JotForm Submission ID
                created_at: submission.created_at,
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                position_applied: position,
                status: submission.status || 'New', // JotForm status or default
                resume_url: resumeUrl
            };
        });

        return new Response(JSON.stringify(applicants), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
