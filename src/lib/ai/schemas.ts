import { z } from "zod";

// 1. Applicant Summary Schema
export const ApplicantSummarySchema = z.object({
    summary: z.string().describe("A concise professional summary of the applicant."),
    strengths: z.array(z.string()).describe("Key strengths identified from the resume."),
    risks: z.array(z.string()).describe("Potential risks or red flags."),
    salary_insights: z.string().optional().describe("Estimated salary range or expectations if mentioned."),
    tags: z.array(z.string()).describe("Relevant skills or keywords."),
});

// 2. Applicant Ranking Schema
export const ApplicantRankingSchema = z.object({
    rankings: z.array(
        z.object({
            applicant_id: z.string(),
            name: z.string(),
            score: z.number().min(0).max(100),
            reason: z.string().describe("Why this applicant was ranked this way."),
            match_level: z.enum(["High", "Medium", "Low"]),
        })
    ),
    best_candidate_id: z.string().optional(),
});

// 3. Offer Letter Draft Schema
export const OfferLetterSchema = z.object({
    subject: z.string().describe("Email subject line."),
    body: z.string().describe("The main content of the offer letter."),
    key_terms: z.array(z.string()).describe("Key terms highlighted (e.g. Salary, Start Date)."),
    tone: z.string().describe("The tone of the letter (e.g. Professional, Welcoming)."),
});

// 4. Onboarding Summary Schema
export const OnboardingSummarySchema = z.object({
    status_summary: z.string().describe("Overall status of onboarding."),
    missing_documents: z.array(z.string()).describe("List of documents not yet submitted."),
    next_steps: z.array(z.string()).describe("Actionable next steps for the HR manager."),
    estimated_completion: z.string().optional().describe("Estimated time to completion."),
});

// 5. Setup Helper Schema
export const SetupHelperSchema = z.object({
    advice: z.string().describe("Guidance on how to configure the system."),
    config_suggestions: z.array(
        z.object({
            setting_key: z.string(),
            suggested_value: z.string(),
            reason: z.string(),
        })
    ),
});

export type ApplicantSummary = z.infer<typeof ApplicantSummarySchema>;
export type ApplicantRanking = z.infer<typeof ApplicantRankingSchema>;
export type OfferLetter = z.infer<typeof OfferLetterSchema>;
export type OnboardingSummary = z.infer<typeof OnboardingSummarySchema>;
export type SetupHelper = z.infer<typeof SetupHelperSchema>;
