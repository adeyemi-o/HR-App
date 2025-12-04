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

    const responseText = data.result?.response || data.output || data.response;

    if (!responseText) {
        console.error("AI Response missing:", data);
        throw new Error("AI did not return a response.");
    }

    try {
        // The AI might wrap JSON in markdown code blocks ```json ... ```
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(cleanJson) as T;
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
        return callAI<OnboardingSummary>(
            'ai-onboarding-logic',
            AIPrompts.onboardingSummary(),
            { employee, status }
        );
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
