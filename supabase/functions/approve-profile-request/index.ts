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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Verify user is admin
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required')
        }

        const { requestId, action } = await req.json() // action: 'approve' | 'reject'

        if (!requestId || !action) {
            throw new Error('Missing requestId or action')
        }

        // Create Admin Client for updates
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get the request
        const { data: request, error: requestError } = await supabaseAdmin
            .from('profile_change_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (requestError || !request) throw new Error('Request not found')

        if (action === 'reject') {
            await supabaseAdmin
                .from('profile_change_requests')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('id', requestId)

            return new Response(
                JSON.stringify({ message: 'Request rejected' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Approve logic
        const changes = request.changes
        const updates: any = {}
        if (changes.first_name) updates.first_name = changes.first_name
        if (changes.last_name) updates.last_name = changes.last_name
        if (changes.phone_number) updates.phone_number = changes.phone_number
        // Email is handled separately via Auth API

        // Update Profile
        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(updates)
                .eq('id', request.user_id)

            if (updateError) throw updateError
        }

        // Update Email if changed
        if (changes.email) {
            const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
                request.user_id,
                { email: changes.email }
            )
            if (emailError) throw emailError
        }

        // Mark request as approved
        await supabaseAdmin
            .from('profile_change_requests')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', requestId)

        return new Response(
            JSON.stringify({ message: 'Request approved and profile updated' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
