Below is the entire AI integration plan **cleanly formatted in Markdown** so you can paste it into your documentation, repo, or Notion.

---

# 🧠 AI Integration Plan for Prolific HR (Cloudflare Workers AI)

This document describes how to integrate AI-powered features into the Prolific HR application using **self-hosted LLMs on Cloudflare Workers AI**, based on the current codebase analysis.

---

# 0. Architecture Overview

### Current System

* **Frontend:** React + Vite + TS + Tailwind + shadcn/ui
* **Backend:** Supabase (DB, storage, edge functions)
* **Automation:** Supabase Functions → WordPress/LearnDash, n8n, Airtable

### New AI Layer

* **Cloudflare Worker (AI Gateway)**

  * Model examples: `@cf/meta/llama-3.1-8b-instruct`
  * Exposes endpoints:

    * `/ai/summarize-applicant`
    * `/ai/rank-applicants`
    * `/ai/draft-offer-letter`
    * `/ai/onboarding-summary`
    * `/ai/setup-helper`

* **App Integration**

  * Frontend → AI (summaries, ranking, UI helpers)
  * Supabase Functions → AI (offer drafting, onboarding insights)

* **Supabase**

  * New table: `ai_logs` (for monitoring)
  * Optional: `ai_cache`

---

# 1. Cloudflare Worker Setup

## 1.1 `wrangler.toml`

```toml
name = "prolific-hr-ai-worker"
main = "src/index.ts"
compatibility_date = "2025-12-01"

[ai]
binding = "AI"
```

---

## 1.2 Worker Router

```ts
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    switch (url.pathname) {
      case "/ai/summarize-applicant": return summarizeApplicant(body, env);
      case "/ai/rank-applicants": return rankApplicants(body, env);
      case "/ai/draft-offer-letter": return draftOfferLetter(body, env);
      case "/ai/onboarding-summary": return onboardingSummary(body, env);
      case "/ai/setup-helper": return setupHelper(body, env);
      default: return new Response("Not Found", { status: 404 });
    }
  }
} satisfies ExportedHandler<Env>;
```

---

# 2. Feature-Level AI Integration

Below are the new AI capabilities mapped to your existing components.

---

# 2.1 Applicant Summary

**File:** `src/features/applicants/ApplicantDetailsPage.tsx`
**Purpose:** AI-generated summary, salary suggestion, missing documents.

## Endpoint: `/ai/summarize-applicant`

```ts
async function summarizeApplicant(body, env) {
  const { applicant, requirements } = body;

  const messages = [
    {
      role: "system",
      content: "You are an HR assistant. Respond in JSON only."
    },
    {
      role: "user",
      content: `
Given the applicant and requirement data, produce:
1. Summary bullets
2. Salary recommendation
3. Suggested start date
4. Missing documents

Applicant:
${JSON.stringify(applicant)}

Requirements:
${JSON.stringify(requirements ?? [])}
      `
    }
  ];

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    max_tokens: 512,
    temperature: 0.2
  });

  return Response.json(JSON.parse(result.response));
}
```

## Frontend Integration

`src/lib/aiClient.ts`:

```ts
export async function getApplicantSummary(input) {
  const res = await fetch(`${AI_URL}/ai/summarize-applicant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return res.json();
}
```

In `ApplicantDetailsPage.tsx`:

* Fetch summary using TanStack Query.
* Display bullets, salary suggestion, missing docs.

---

# 2.2 Applicant Ranking

**File:** `src/features/applicants/ApplicantList.tsx`
**Purpose:** Semantic ranking vs job description.

## Endpoint: `/ai/rank-applicants`

```ts
async function rankApplicants(body, env) {
  const { applicants, jobDescription } = body;

  const messages = [
    {
      role: "system",
      content: "Rank applicants by fit. Respond in JSON."
    },
    {
      role: "user",
      content: `
Score each applicant 0–100 based on this job description:

${jobDescription}

Applicants:
${JSON.stringify(applicants)}
      `
    }
  ];

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    max_tokens: 1024,
    temperature: 0.3
  });

  return Response.json(JSON.parse(result.response));
}
```

## Frontend Integration

* Add “Rank with AI” button.
* Provide job description input.
* Sort list using AI scores.

---

# 2.3 Offer Letter Drafting

**File:** `supabase/functions/sendOffer/index.ts` (recommended for backend)
**Alternative:** `OfferEditor` (frontend preview)

## Endpoint: `/ai/draft-offer-letter`

```ts
async function draftOfferLetter(body, env) {
  const { applicant, offerInput, company } = body;

  const messages = [
    {
      role: "system",
      content: "Draft a professional caregiver offer letter (Canada)."
    },
    {
      role: "user",
      content: `
Applicant:
${JSON.stringify(applicant)}

Offer:
${JSON.stringify(offerInput)}

Company:
${JSON.stringify(company)}
      `
    }
  ];

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    max_tokens: 1024,
    temperature: 0.4
  });

  return Response.json({ letter: result.response });
}
```

## UI Integration

* Add **Generate with AI** button in `OfferEditor.tsx`.
* Fill template field with AI output for manual editing.

---

# 2.4 Onboarding Summary & Risks

**File:** UI + `employeeService.ts`
**Purpose:** Summarize onboarding state & highlight risks.

## Endpoint: `/ai/onboarding-summary`

```ts
async function onboardingSummary(body, env) {
  const { employee, offers, complianceDocs, settings } = body;

  const messages = [
    { role: "system", content: "You evaluate onboarding & compliance." },
    {
      role: "user",
      content: `
Provide:
1) Onboarding summary
2) Next HR actions
3) Compliance risks

Employee:
${JSON.stringify(employee)}

Offer:
${JSON.stringify(offers)}

Compliance:
${JSON.stringify(complianceDocs)}

Settings:
${JSON.stringify(settings)}
      `
    }
  ];

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    max_tokens: 768
  });

  return Response.json({ analysis: result.response });
}
```

---

# 2.5 Setup & Integration Helper

**File:** `src/features/settings/SettingsPage.tsx`
**Purpose:** Validate WP/LearnDash setup, generate invite drafts.

## Endpoint: `/ai/setup-helper`

```ts
async function setupHelper(body, env) {
  const { wpApiUrl, learndashGroupMap, usersToInvite } = body;

  const messages = [
    {
      role: "system",
      content: "Assist HR admin with integration setup."
    },
    {
      role: "user",
      content: `
Validate URLs, suggest mapping improvements, and draft invite emails.

WordPress API URL: ${wpApiUrl}
Group Map: ${JSON.stringify(learndashGroupMap)}
Users: ${JSON.stringify(usersToInvite)}
      `
    }
  ];

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    max_tokens: 768
  });

  return Response.json(JSON.parse(result.response));
}
```

---

# 3. Supabase Enhancements

## 3.1 `ai_logs` Table

```sql
create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  tenant_id uuid,
  user_id uuid,
  feature text,
  success boolean,
  tokens_in int,
  tokens_out int,
  model text,
  error text
);
```

## 3.2 Service Layer Refactor (Optional)

Move Supabase calls out of components and into `services/*` to make AI logic easier to integrate and test.

---

# 4. Rollout Strategy

## Phase 1 — Quick Wins

* Applicant Summary (Details Page)
* Offer Letter Drafting (Offer Editor)

## Phase 2 — Productivity Boost

* Applicant Ranking
* Onboarding Summary & Risk Detection

## Phase 3 — Admin & Intelligence

* Setup Helper
* RAG for HR Policies (future)

---


