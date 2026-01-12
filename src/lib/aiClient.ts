import { supabase } from './supabase';
import { AIPrompts } from './ai/prompts';
import type {
    ApplicantSummary,
    ApplicantRanking,
    OfferLetter,
    OnboardingSummary,
    SetupHelper
} from './ai/schemas';

async function callAI<T>(
    functionName: string,
    systemPrompt: string,
    userInput: any
): Promise<T> {
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: typeof userInput === 'string' ? userInput : JSON.stringify(userInput) }
    ];

    const { data, error } = await supabase.functions.invoke(functionName, {
        body: { messages } // Pass messages to override backend default
    });

    if (error) throw error;

    // The Worker returns { result: { response: "JSON string" } }
    // or sometimes just the output if cached?
    // Let's handle both.

    // Debug: Log the full response to understand structure
    console.log("AI Response structure:", data);

    // Worker returns: { success: true, task, model, result: { response: "..." } }
    // Or from cache: { success: true, output: "...", from_cache: true }

    // Try different paths based on response structure
    let responseText = null;

    // Path 1: Cached response (from Supabase Edge Function)
    if (data.output) {
        responseText = data.output;
    }
    // Path 2: Fresh AI response from Worker
    else if (data.result) {
        // For chat/reasoning tasks, Worker returns { result: { response: "..." } }
        responseText = data.result.response || data.result;
    }
    // Path 3: Direct response field
    else if (data.response) {
        responseText = data.response;
    }
    // Path 4: Error returned in data (e.g. from try-catch in Edge Function)
    else if (data.error) {
        console.error("AI returned specific error:", data.error);
        throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
    }

    if (!responseText) {
        console.error("AI Response missing:", data);
        throw new Error("AI did not return a response.");
    }

    console.log("Extracted response:", responseText);

    // Check if responseText is already an object (not a string)
    if (typeof responseText === 'object') {
        console.log("Response is already an object:", responseText);
        return responseText as T;
    }

    try {
        // The AI might wrap JSON in markdown code blocks ```json ... ```
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        console.log("Parsed AI response:", parsed);
        return parsed as T;
    } catch (e) {
        console.error("Failed to parse AI JSON:", responseText);
        throw new Error("AI returned invalid JSON.");
    }
}

export const aiClient = {
    summarizeApplicant: async (applicant: any) => {
        return callAI<ApplicantSummary>(
            'ai-summarize-applicant',
            AIPrompts.summarizeApplicant(),
            applicant
        );
    },
    rankApplicants: async (candidates: any[], job_description: string) => {
        return callAI<ApplicantRanking>(
            'ai-rank-applicants',
            AIPrompts.rankApplicants(job_description),
            candidates
        );
    },
    draftOfferLetter: async (details: any) => {
        return callAI<OfferLetter>(
            'ai-draft-offer-letter',
            AIPrompts.draftOfferLetter(),
            details
        );
    },
    onboardingLogic: async (employee: any, status: string) => {
        // Inject the prompt/schema into the employee object so the AI sees it
        // The Edge Function strips unknown top-level keys, but 'employee' is a record(any)
        const prompt = AIPrompts.onboardingSummary();
        const enrichedEmployee = {
            ...employee,
            _ai_instructions: prompt
        };

        // Direct invoke to match Edge Function schema (expecting { employee, status })
        const { data, error } = await supabase.functions.invoke('ai-onboarding-logic', {
            body: { employee: enrichedEmployee, status }
        });

        if (error) throw error;

        // Handle error returned in data
        if (data && data.error) {
            console.error("AI returned specific error:", data.error);
            throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
        }

        // Extract output similar to callAI logic
        let responseText = null;
        if (data.output) responseText = data.output;
        else if (data.result && data.result.response) responseText = data.result.response;
        else if (data.result) responseText = data.result;
        else if (data.response) responseText = data.response;

        if (!responseText) {
            console.error("AI Response missing in onboarding logic:", data);
            throw new Error("AI did not return a response.");
        }

        // Parse JSON if needed
        if (typeof responseText === 'object') return responseText as OnboardingSummary;

        try {
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
            const parsed = JSON.parse(cleanJson);
            return parsed as OnboardingSummary;
        } catch (e) {
            console.error("Failed to parse AI JSON:", responseText);
            throw new Error("AI returned invalid JSON.");
        }
    },
    wpValidation: async (group: string, user: any) => {
        // Fallback to raw call if no schema/prompt defined
        const { data, error } = await supabase.functions.invoke('ai-wp-validation', {
            body: { group, user }
        });
        if (error) throw error;
        return data;
    },
    setupHelper: async (query: string) => {
        return callAI<SetupHelper>(
            'ai-summarize-applicant',
            AIPrompts.setupHelper(),
            query
        );
    }
};
