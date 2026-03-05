# AI Endpoints Reference

> **Note:** For a comprehensive guide on the AI architecture, integration, and usage, please refer to [AI_INTEGRATION.md](./AI_INTEGRATION.md).

This document lists the available Supabase Edge Functions for AI tasks. All endpoints expect a `POST` request with a JSON body and a valid Supabase Auth token (Anon or User).

## Endpoints

### 1. Summarize Applicant
- **Endpoint:** `ai-summarize-applicant`
- **Purpose:** Generates a structured summary of an applicant's profile, including scores, strengths, and risks.
- **Model:** `@cf/meta/llama-3-8b-instruct` (via Worker)
- **Input:** `{ applicant: object }` or `{ messages: [...] }`
- **Output:** `ApplicantSummary` JSON

### 2. Rank Applicants
- **Endpoint:** `ai-rank-applicants`
- **Purpose:** Ranks a list of candidates against a job description.
- **Model:** `@cf/deepseek/deepseek-r1-distill-qwen-32b` (via Worker)
- **Input:** `{ candidates: array, job_description: string }` or `{ messages: [...] }`
- **Output:** `ApplicantRanking` JSON

### 3. Draft Offer Letter
- **Endpoint:** `ai-draft-offer-letter`
- **Purpose:** Generates a professional offer letter based on employee details.
- **Model:** `@cf/meta/llama-3-8b-instruct` (via Worker)
- **Input:** `{ employeeName, position, rate, startDate, ... }` or `{ messages: [...] }`
- **Output:** `OfferLetter` JSON

### 4. Onboarding Logic
- **Endpoint:** `ai-onboarding-logic`
- **Purpose:** Analyzes onboarding status and suggests next steps.
- **Model:** `@cf/deepseek/deepseek-r1-distill-qwen-32b` (via Worker)
- **Input:** `{ employee: object, status: string }` or `{ messages: [...] }`
- **Output:** `OnboardingSummary` JSON

### 5. WP Validation
- **Endpoint:** `ai-wp-validation`
- **Purpose:** Validates WordPress/LearnDash user setup.
- **Model:** `@cf/deepseek/deepseek-r1-distill-qwen-32b` (via Worker)
- **Input:** `{ group: string, user: object }`
- **Output:** Validation result string/JSON

---

**Auth Header:**
`Authorization: Bearer <SUPABASE_ANON_KEY>`
