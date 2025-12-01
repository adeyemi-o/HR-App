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

        // 3. Send Email via Brevo
        const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
        if (!BREVO_API_KEY) {
            throw new Error('BREVO_API_KEY not configured')
        }

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
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h1 style="color: #7152F3;">Document Request</h1>
                        <p>Hello ${name || 'Applicant'},</p>
                        <p>We are missing your <strong>${formName}</strong> for your application at Prolific Homecare.</p>
                        <p>Please click the button below to complete and submit the form as soon as possible:</p>
                        <br/>
                        <a href="${formUrl}" style="background-color: #7152F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Complete ${formName}</a>
                        <br/><br/>
                        <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br/>${formUrl}</p>
                        <br/>
                        <p>Best regards,<br/>Prolific Homecare HR Team</p>
                    </div>
                `
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
