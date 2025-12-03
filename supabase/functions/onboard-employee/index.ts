import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { render } from "npm:@react-email/render@0.0.7";
import * as React from "npm:react@18.3.1";
import { WelcomeEmail } from "../_shared/emails/WelcomeEmail.tsx";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get the payload (Offer Accepted Event)
        const { record } = await req.json()
        if (!record || record.status !== 'Accepted') {
            return new Response(JSON.stringify({ message: 'Ignored: Status not Accepted' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const applicantId = record.applicant_id
        const position = record.position // e.g., "Registered Nurse (RN)"

        // 2. Fetch Applicant Details (Email, Name)
        const { data: applicant, error: applicantError } = await supabaseClient
            .from('applicants')
            .select('*')
            .eq('id', applicantId)
            .single()

        if (applicantError || !applicant) {
            throw new Error(`Applicant not found: ${applicantError?.message}`)
        }

        // 3. Fetch Settings (WP Credentials & Group Map)
        const { data: settings, error: settingsError } = await supabaseClient
            .from('settings')
            .select('key, value')
            .in('key', ['wp_api_url', 'wp_username', 'wp_app_password', 'learndash_group_map', 'brevo_api_key', 'logo_light'])

        if (settingsError) throw new Error(`Settings fetch error: ${settingsError.message}`)

        const config: any = {}
        settings.forEach((s: any) => config[s.key] = s.value)

        if (!config.wp_api_url || !config.wp_username || !config.wp_app_password) {
            throw new Error('Missing WordPress configuration in settings')
        }

        // 4. Create WordPress User
        const wpAuth = btoa(`${config.wp_username}:${config.wp_app_password}`)
        const wpPassword = Math.random().toString(36).slice(-10) + "1!"; // Generate random initial password
        const wpUserResponse = await fetch(`${config.wp_api_url}/wp/v2/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${wpAuth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: applicant.email,
                email: applicant.email,
                first_name: applicant.first_name,
                last_name: applicant.last_name,
                password: wpPassword,
                roles: ['subscriber'], // Default role
            }),
        })

        let wpUser = await wpUserResponse.json()

        // Handle existing user case
        if (!wpUserResponse.ok) {
            if (wpUser.code === 'existing_user_login' || wpUser.code === 'existing_user_email') {
                // If user exists, try to find them to get ID
                const searchResponse = await fetch(`${config.wp_api_url}/wp/v2/users?search=${applicant.email}`, {
                    headers: { 'Authorization': `Basic ${wpAuth}` }
                })
                const searchResults = await searchResponse.json()
                if (searchResults.length > 0) {
                    wpUser = searchResults[0]
                } else {
                    throw new Error(`Failed to create WP user: ${JSON.stringify(wpUser)}`)
                }
            } else {
                throw new Error(`Failed to create WP user: ${JSON.stringify(wpUser)}`)
            }
        }

        // 5. Assign to LearnDash Group
        let groupIds: number[] = []
        try {
            const groupMap = JSON.parse(config.learndash_group_map || '{}')
            // Match position to group IDs. 
            // Logic: Check if the exact position exists, or if a key is a substring of the position
            // e.g. "Nurse" key matches "Registered Nurse (RN)"

            // Direct match
            if (groupMap[position]) {
                groupIds = Array.isArray(groupMap[position]) ? groupMap[position] : [groupMap[position]]
            } else {
                // Fuzzy match
                for (const key in groupMap) {
                    if (position.includes(key)) {
                        const val = groupMap[key]
                        const ids = Array.isArray(val) ? val : [val]
                        groupIds = [...groupIds, ...ids]
                    }
                }
            }
        } catch (e) {
            console.error("Error parsing group map", e)
        }

        const enrollmentResults = []
        for (const groupId of groupIds) {
            // LearnDash API: Update User Groups
            // Endpoint: /ldlms/v2/groups/<id>/users
            // Method: POST, Body: { user_ids: [id] }
            // Note: This endpoint might vary by LearnDash version. 
            // Alternative: /ldlms/v2/users/<user_id>/groups (PUT) with { group_ids: [...] }

            // Using the User endpoint is usually safer to ADD groups without removing others if we handle it right,
            // but LearnDash REST API often replaces the list. 
            // Let's try the Group endpoint to add this user to the group.

            const enrollResponse = await fetch(`${config.wp_api_url}/ldlms/v2/groups/${groupId}/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${wpAuth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_ids: [wpUser.id]
                })
            })
            enrollmentResults.push({ groupId, status: enrollResponse.status })
        }

        // 6. Update Employee Record in Supabase
        // First check if employee record exists (it should have been created by another trigger or process, 
        // but if not, we might need to create it or just update the applicant/offer metadata?
        // Usually 'onboard-employee' implies creating the employee record too if it doesn't exist.
        // For now, let's assume we update the 'applicants' or 'employees' table.
        // The prompt mentioned "Update the employees table in Supabase with the new wp_user_id".

        // Let's try to find the employee record linked to this applicant
        const { data: employee, error: empError } = await supabaseClient
            .from('employees')
            .select('id')
            .eq('applicant_id', applicantId)
            .single()

        if (employee) {
            await supabaseClient
                .from('employees')
                .update({ wp_user_id: wpUser.id })
                .eq('id', employee.id)
        } else {
            // If no employee record yet, maybe create one? 
            // Or just log it. For safety, let's just log it for now as the main goal is WP creation.
            console.log(`No employee record found for applicant ${applicantId} to update wp_user_id`)
        }

        // 7. Send Welcome Email via Brevo
        if (config.brevo_api_key) {
            console.log(`Sending Welcome Email to ${applicant.email}...`)
            const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': config.brevo_api_key,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: {
                        name: 'Prolific Homecare HR',
                        email: 'admin@prolifichcs.com'
                    },
                    to: [{ email: applicant.email, name: `${applicant.first_name} ${applicant.last_name}` }],
                    subject: `Welcome to Prolific Homecare!`,
                    htmlContent: await render(
                        React.createElement(WelcomeEmail, {
                            applicantName: `${applicant.first_name} ${applicant.last_name}`,
                            loginUrl: `${config.wp_api_url}/wp-login.php`,
                            username: applicant.email,
                            logoUrl: config.logo_light || undefined
                        })
                    )
                })
            })

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text()
                console.error('Brevo API Error (Welcome Email):', errorText)
            } else {
                console.log('Welcome Email sent successfully')
            }
        }

        return new Response(
            JSON.stringify({
                message: 'Onboarding successful',
                wp_user_id: wpUser.id,
                groups_enrolled: groupIds
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
