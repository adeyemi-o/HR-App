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

        const { userId, updates } = await req.json()

        if (!userId || !updates) {
            throw new Error('Missing userId or updates')
        }

        // Create Admin Client for updates
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Update Profile Data
        const profileUpdates: any = {}
        if (updates.first_name) profileUpdates.first_name = updates.first_name
        if (updates.last_name) profileUpdates.last_name = updates.last_name
        if (updates.phone_number) profileUpdates.phone_number = updates.phone_number
        if (updates.role) profileUpdates.role = updates.role

        if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdates)
                .eq('id', userId)

            if (profileError) throw profileError
        }

        // Update Auth Data (Email, Password)
        const authUpdates: any = {}
        if (updates.email) authUpdates.email = updates.email
        if (updates.password) authUpdates.password = updates.password

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                authUpdates
            )
            if (authError) throw authError
        }

        return new Response(
            JSON.stringify({ message: 'User updated successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
