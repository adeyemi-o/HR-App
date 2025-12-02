import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

        const applicants = data.content.map((submission: any) => {
            const answers = submission.answers || {};
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
                id: submission.id,
                created_at: submission.created_at,
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                position_applied: position,
                status: submission.status || 'New',
                resume_url: resumeUrl
            };
        });

        return new Response(JSON.stringify(applicants), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
