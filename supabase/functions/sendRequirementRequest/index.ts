import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { render } from "npm:@react-email/render@0.0.7";
import * as React from "npm:react@18.3.1";
import { RequirementRequestEmail } from "../_shared/emails/RequirementRequestEmail.tsx";

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

        const { email, name, formName, formUrl } = await req.json()

        if (!email || !formUrl) {
            return new Response(JSON.stringify({ error: 'Email and Form URL are required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 3. Fetch Brevo API Key from Settings (using Service Role)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'brevo_api_key')
            .single()

        if (settingsError || !settingsData?.value) {
            console.error('Settings Error:', settingsError)
            throw new Error('Brevo API Key not configured in settings')
        }

        const BREVO_API_KEY = settingsData.value

        console.log(`Sending ${formName} request to ${email}...`)

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
                to: [{ email: email, name: name || email }],
                subject: `Action Required: Please submit your ${formName}`,
                htmlContent: await render(
                    React.createElement(RequirementRequestEmail, {
                        applicantName: name || 'Applicant',
                        missingItems: [formName],
                        uploadUrl: formUrl
                    })
                )
            })
        })

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.error('Brevo API Error:', errorText)
            throw new Error(`Failed to send email: ${errorText}`)
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error("Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
