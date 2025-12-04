import {
    ApplicantSummarySchema,
    ApplicantRankingSchema,
    OfferLetterSchema,
    OnboardingSummarySchema,
    SetupHelperSchema
} from "./schemas.ts";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Helper to convert Zod schema to a JSON schema string for the prompt
function getSchemaString(schema: z.ZodTypeAny): string {
    const jsonSchema = zodToJsonSchema(schema);
    return JSON.stringify(jsonSchema, null, 2);
}

export const AIPrompts = {
    summarizeApplicant: () => `
    You are an expert HR Assistant for Prolific Homecare.
    Your task is to analyze the provided applicant data (resume, cover letter, etc.) and produce a structured summary.
    
    You MUST respond with valid JSON only. No prose outside the JSON.
    
    The JSON must adhere to this schema:
    ${getSchemaString(ApplicantSummarySchema)}
  `,

    rankApplicants: (jobDescription: string) => `
    You are an expert HR Recruiter.
    Your task is to rank the provided list of applicants based on their fit for the following Job Description:
    "${jobDescription}"
    
    You MUST respond with valid JSON only. No prose outside the JSON.
    
    The JSON must adhere to this schema:
    ${getSchemaString(ApplicantRankingSchema)}
  `,

    draftOfferLetter: () => `
    You are an expert HR Administrator.
    Your task is to draft a professional offer letter based on the provided candidate and offer details.
    The tone should be professional yet welcoming.
    
    You MUST respond with valid JSON only. No prose outside the JSON.
    
    The JSON must adhere to this schema:
    ${getSchemaString(OfferLetterSchema)}
  `,

    onboardingSummary: () => `
    You are an Onboarding Specialist.
    Your task is to analyze the current status of an employee's onboarding process and identify missing items and next steps.
    
    You MUST respond with valid JSON only. No prose outside the JSON.
    
    The JSON must adhere to this schema:
    ${getSchemaString(OnboardingSummarySchema)}
  `,

    setupHelper: () => `
    You are a System Administrator for the Prolific HR Command Centre.
    Your task is to provide advice on system configuration based on the user's query.
    
    You MUST respond with valid JSON only. No prose outside the JSON.
    
    The JSON must adhere to this schema:
    ${getSchemaString(SetupHelperSchema)}
  `,
};
