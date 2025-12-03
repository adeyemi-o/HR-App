import { supabase } from './supabase';

export const aiClient = {
    summarizeApplicant: async (applicant: any) => {
        const { data, error } = await supabase.functions.invoke('ai-summarize-applicant', {
            body: { applicant }
        });
        if (error) throw error;
        return data;
    },
    rankApplicants: async (candidates: any[], job_description: string) => {
        const { data, error } = await supabase.functions.invoke('ai-rank-applicants', {
            body: { candidates, job_description }
        });
        if (error) throw error;
        return data;
    },
    draftOfferLetter: async (details: any) => {
        const { data, error } = await supabase.functions.invoke('ai-draft-offer-letter', {
            body: details
        });
        if (error) throw error;
        return data;
    },
    onboardingLogic: async (employee: any, status: string) => {
        const { data, error } = await supabase.functions.invoke('ai-onboarding-logic', {
            body: { employee, status }
        });
        if (error) throw error;
        return data;
    },
    wpValidation: async (group: string, user: any) => {
        const { data, error } = await supabase.functions.invoke('ai-wp-validation', {
            body: { group, user }
        });
        if (error) throw error;
        return data;
    }
};
