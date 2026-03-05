import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
import { aiRequest } from "../_shared/aiClient.ts"
import { getContext } from "../_shared/context.ts"
import { getSupabaseClient } from "../_shared/supabaseClient.ts"
import pdf from "npm:pdf-parse@1.1.1";
import { Buffer } from "node:buffer";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
}

const schema = z.union([
    z.object({
        applicant: z.object({
            id: z.string().optional(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            email: z.string().optional(),
            resume_text: z.string().optional().nullable(),
            resume_url: z.string().optional().nullable(),
            skills: z.array(z.string()).optional(),
        }).passthrough()
    }),
    z.object({
        messages: z.array(z.any())
    })
]);

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

        // Determine input: either 'applicant' object or 'messages' array
        let input = 'messages' in validation.data
            ? { messages: validation.data.messages }
            : validation.data.applicant;

        const context = await getContext(req)
        const supabase = getSupabaseClient();

        // Helper to get applicant data from input
        let applicantData: any = null;
        let userMessageIndex = -1;

        if ('messages' in validation.data) {
            userMessageIndex = validation.data.messages.findIndex((m: any) => m.role === 'user');
            if (userMessageIndex !== -1) {
                try {
                    const content = validation.data.messages[userMessageIndex].content;
                    applicantData = typeof content === 'string' ? JSON.parse(content) : content;
                } catch (e) {
                    console.error("Failed to parse user message content:", e);
                }
            }
        } else {
            applicantData = validation.data.applicant;
        }

        // Resume Extraction Logic
        if (applicantData && applicantData.id) {
            // If we have a URL but no text, try to extract it
            if (!applicantData.resume_text && applicantData.resume_url) {
                try {
                    console.log(`Attempting to extract text from resume: ${applicantData.resume_url}`);

                    // Only support PDF for now
                    if (applicantData.resume_url.toLowerCase().endsWith('.pdf')) {
                        const fileRes = await fetch(applicantData.resume_url);
                        if (fileRes.ok) {
                            const arrayBuffer = await fileRes.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            const pdfData = await pdf(buffer);

                            if (pdfData.text) {
                                console.log("Text extracted successfully, length:", pdfData.text.length);
                                const cleanedText = pdfData.text.trim();

                                // Update DB
                                await supabase
                                    .from('applicants')
                                    .update({ resume_text: cleanedText })
                                    .eq('id', applicantData.id);

                                // Update applicant data
                                applicantData.resume_text = cleanedText;
                            }
                        } else {
                            console.error("Failed to fetch resume file:", fileRes.status);
                        }
                    } else {
                        console.log("Skipping extraction: Not a PDF file.");
                    }
                } catch (err) {
                    console.error("Resume extraction failed:", err);
                }
            }
        }

        // Reconstruct input if we modified it
        if ('messages' in validation.data && userMessageIndex !== -1 && applicantData) {
            validation.data.messages[userMessageIndex].content = JSON.stringify(applicantData);
            input = { messages: validation.data.messages };
        } else if (!('messages' in validation.data) && applicantData) {
            input = applicantData;
        }

        const result = await aiRequest({
            task: "summary",
            input: input,
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
