import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
import { aiRequest } from "../_shared/aiClient.ts"
import { getContext } from "../_shared/context.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
}

const schema = z.object({
    candidate_name: z.string(),
    position: z.string(),
    start_date: z.string(),
    salary_rate: z.string(),
    manager_name: z.string()
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

        const context = await getContext(req)

        const result = await aiRequest({
            task: "offer_letter",
            input: validation.data,
            tenantId: context.tenantId,
            userId: context.userId,
            feature: "ai-draft-offer-letter"
        })

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400
        })
    }
})
