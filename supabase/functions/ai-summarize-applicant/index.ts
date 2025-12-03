import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
import { aiRequest } from "../_shared/aiClient.ts"
import { getContext } from "../_shared/context.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
}

const schema = z.object({
    applicant: z.object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        resume_text: z.string().optional(),
        skills: z.array(z.string()).optional(),
        // Allow other fields to pass through
    }).passthrough()
});

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const validation = schema.safeParse(body)

        if (!validation.success) {
            throw new Error(`Validation Error: ${JSON.stringify(validation.error.issues)}`)
        }

        const { applicant } = validation.data
        const context = await getContext(req)

        const result = await aiRequest({
            task: "summary",
            input: applicant,
            tenantId: context.tenantId,
            userId: context.userId,
            feature: "ai-summarize-applicant"
        })

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400
        })
    }
})
