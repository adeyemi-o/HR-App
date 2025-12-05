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
    You are an expert HR Assistant for Prolific Homecare, a healthcare staffing company.

    TASK: Analyze the applicant's information and CREATE a professional summary with the following:
    1. A concise professional summary (2-3 sentences about their background and fit for healthcare roles)
    2. List 3-5 key strengths based on their experience, skills, and qualifications
    3. List any potential risks or concerns (employment gaps, incomplete information, lack of certifications, etc.)
    4. Provide salary insights based on their experience level (e.g., "$15-18/hour for entry-level CNA")
    5. Extract relevant skill tags (e.g., "Home Health Care", "CNA Certified", "Bilingual", "Full-time Available")

    IMPORTANT: Do NOT simply return the input data. You must ANALYZE and SUMMARIZE the applicant's qualifications.

    You MUST respond with valid JSON only matching this exact schema:
    {
      "summary": "string - professional summary of the applicant",
      "strengths": ["string", "string", ...],
      "risks": ["string", "string", ...],
      "salary_insights": "string or null - estimated salary range",
      "tags": ["string", "string", ...]
    }

    Respond with ONLY the JSON object, no other text or markdown formatting.
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
