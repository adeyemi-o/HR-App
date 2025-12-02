# 🧠 Prolific HR — AI Integration Specification

Cloudflare Workers AI + Supabase + React (Vite) + React Email
Author: Adeyemi
Date: 2025-12-01
Version: 1.3 (Fully Corrected, Production Ready)

---

# 1. 📁 Full Project Folder Structure (Including Worker)

This structure shows **only relevant directories** for the AI integration.

```text
prolific-hr-app/
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   ├── aiClient.ts
│   │   └── utils.ts
│   │
│   ├── services/
│   │   ├── applicantService.ts
│   │   ├── employeeService.ts
│   │   ├── offerService.ts              # React Email integrated
│   │   └── settingsService.ts
│   │
│   ├── emails/                          # React Email templates
│   │   ├── OfferLetter.tsx
│   │   └── components/
│   │       └── EmailLayout.tsx
│   │
│   ├── features/
│   │   ├── applicants/
│   │   │   ├── ApplicantList.tsx
│   │   │   ├── ApplicantDetailsPage.tsx
│   │   │   └── ApplicantAISummaryPanel.tsx
│   │   │
│   │   ├── offers/
│   │   │   ├── OfferEditor.tsx
│   │   │   ├── OfferAIPreview.tsx
│   │   │   └── OfferSendDialog.tsx
│   │   │
│   │   ├── employees/
│   │   │   ├── EmployeeList.tsx
│   │   │   └── EmployeeAIInsightsPanel.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── SettingsPage.tsx
│   │   │   └── SettingsAIHelperPanel.tsx
│   │
│   ├── components/ui/
│   └── styles/
│
├── supabase/
│   ├── migrations/
│   │   ├── 20251201_ai_logs.sql
│   │   └── 20251201_ai_cache.sql
│   │
│   └── functions/
│       ├── sendOffer/
│       ├── listApplicants/
│       └── getApplicantDetails/
│
├── workers-ai/
│   ├── wrangler.toml
│   └── src/
│       └── index.ts
│
├── README.md
└── README.ai.md
```

---

# 2. 📘 `README.ai.md` (AI Layer Documentation)

```md
# 🤖 Prolific HR — AI Layer Documentation (React Email Integrated)

The AI layer uses Cloudflare Workers AI to generate summaries, rankings, structured offer letters, onboarding insights, and integration guidance.

Models:
- Llama 3.1 8B Instruct
- Mistral 7B Instruct
- Phi 3.5 Mini

---

## Architecture

React (Vite)  
→ `aiClient.ts`  
→ Cloudflare Worker  
→ Workers AI  
→ Supabase (`ai_logs`, `ai_cache`)

Offer letter flow:

AI (structured JSON)  
→ React Email (HTML rendering)  
→ Supabase `sendOffer`  
→ SMTP / Resend

---

## Offer Letter Generation (React Email)

### Step 1 — Frontend sends:
- applicant info  
- offer payload  
- company settings  

To:

`POST /ai/draft-offer-letter`

### Step 2 — Worker returns structured JSON only:

```json
{
  "intro": "",
  "role_details": "",
  "compensation": "",
  "start_date": "",
  "closing": ""
}
```

### Step 3 — React Email:

```tsx
<OfferLetter
  applicantName={applicant.first_name}
  intro={ai.intro}
  roleDetails={ai.role_details}
  compensation={ai.compensation}
  startDate={ai.start_date}
  closing={ai.closing}
/>
```

### Step 4 — Supabase renders HTML:

```ts
const html = render(<OfferLetter {...props} />);
```

### Step 5 — Email is sent.

---

## AI Endpoints

| Endpoint                  | Purpose                               |
| ------------------------- | ------------------------------------- |
| `/ai/summarize-applicant` | Summaries + salary insights           |
| `/ai/rank-applicants`     | Semantic scoring                      |
| `/ai/draft-offer-letter`  | Structured content for React Email    |
| `/ai/onboarding-summary`  | Onboarding progress                   |
| `/ai/setup-helper`        | Validate integrations + draft invites |

---

## Logging & Caching

* `ai_logs` tracks usage
* `ai_cache` memoizes outputs

---

## Security

* Worker hides LLM keys
* Only POST allowed
* Output validated before template injection

Maintainer: Adeyemi


---

# 3. 🎨 UI Mockups (shadcn-style Panels)

## 3.1 Applicant AI Summary Panel

```text
┌─────────────────────────────────────────────┐
│ Applicant AI Summary                        │
├─────────────────────────────────────────────┤
│ • 5 years caregiving experience             │
│ • CPR valid, CNA certified                  │
│ • Dementia care background                  │
│                                             │
│ Recommended Salary: $19–$22/hr              │
│ Suggested Start Date: Jan 15, 2026          │
│ Missing Docs: CPR Card, TB Test             │
└─────────────────────────────────────────────┘
```

## 3.2 Offer Letter AI Preview

```text
┌────────────────────────────────────────────────────────────┐
│ AI Offer Letter (React Email Preview)                      │
├────────────────────────────────────────────────────────────┤
│ [Styled Preview Rendered via React Email]                  │
│                                                            │
│  Hello Jane Doe,                                           │
│  We are pleased to extend an offer...                      │
│                                                            │
│ ---------------------------------------------------------- │
│ [Regenerate AI]   [Edit Text]   [Send Offer]               │
└────────────────────────────────────────────────────────────┘
```

## 3.3 Employee AI Insights Panel

```text
┌──────────────────────────────────────────────┐
│ Onboarding AI Insights                       │
├──────────────────────────────────────────────┤
│ Status: LearnDash group assigned             │
│ WP user created                              │
│                                              │
│ Remaining: CPR Upload, TB Test               │
│ Risks: Missing TB Test                       │
└──────────────────────────────────────────────┘
```

## 3.4 Settings AI Helper Panel

```text
┌──────────────────────────────────────────────┐
│ AI Setup Assistant                           │
├──────────────────────────────────────────────┤
│ WordPress URL: ✓ Valid                       │
│ Suggested Groups: Caregivers → LD-23         │
│ Invite Email Draft:                          │
│  - Subject: Welcome to Prolific HR           │
│  - Body: ...                                 │
└──────────────────────────────────────────────┘
```

---

# 4. 🗄 Supabase Migration Files

## 4.1 `20251201_ai_logs.sql`

```sql
create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tenant_id uuid,
  user_id uuid,
  feature text not null,
  model text,
  tokens_in integer default 0,
  tokens_out integer default 0,
  success boolean default true,
  error text
);

alter table public.ai_logs enable row level security;

create policy "Allow inserts for users"
  on public.ai_logs for insert
  to authenticated
  with check (auth.uid() = user_id);
```

## 4.2 `20251201_ai_cache.sql`

```sql
create table if not exists public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  input_hash text unique not null,
  output jsonb not null,
  model text,
  ttl_seconds int default 86400
);

alter table public.ai_cache enable row level security;

create policy "cache read access"
  on public.ai_cache
  for select
  to authenticated
  using (true);

create policy "cache write access"
  on public.ai_cache
  for insert
  to authenticated
  with check (true);
```

---

# 5. 🔧 AI Worker — `/ai/draft-offer-letter`

```ts
export async function draftOfferLetter(body, env) {
  const { applicant, offerInput, company } = body;

  const messages = [
    {
      role: "system",
      content:
        "Return ONLY valid JSON for an employment offer letter. No HTML.",
    },
    {
      role: "user",
      content: `
Required JSON structure:
{
  "intro": "",
  "role_details": "",
  "compensation": "",
  "start_date": "",
  "closing": ""
}

Applicant: ${JSON.stringify(applicant)}
Offer: ${JSON.stringify(offerInput)}
Company: ${JSON.stringify(company)}
`
    }
  ];

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    temperature: 0.4,
    max_tokens: 800
  });

  const parsed = JSON.parse(result.response);
  return Response.json(parsed);
}
```

---

# 6. 🔌 Frontend Integration (`OfferEditor.tsx`)

```ts
const aiDraft = await aiClient.generateOfferLetter({
  applicant,
  offerInput: values,
  company: settings,
});

setAiOffer(aiDraft); // stores structured JSON
```

---

# 7. 📨 React Email Template (`OfferLetter.tsx`)

```tsx
import { Html, Body, Container, Text } from "@react-email/components";

export const OfferLetter = ({
  applicantName,
  intro,
  roleDetails,
  compensation,
  startDate,
  closing
}) => (
  <Html>
    <Body>
      <Container>
        <Text>Hello {applicantName},</Text>
        <Text>{intro}</Text>
        <Text>{roleDetails}</Text>
        <Text>{compensation}</Text>
        <Text>Start Date: {startDate}</Text>
        <Text>{closing}</Text>
      </Container>
    </Body>
  </Html>
);
```

---

# 8. 📤 Supabase `sendOffer` (HTML Email Delivery)

```ts
import { render } from "@react-email/render";
import { OfferLetter } from "@/emails/OfferLetter";

export async function sendOfferEmail({ applicant, aiContent, company }) {
  const html = render(
    <OfferLetter
      applicantName={applicant.first_name}
      intro={aiContent.intro}
      roleDetails={aiContent.role_details}
      compensation={aiContent.compensation}
      startDate={aiContent.start_date}
      closing={aiContent.closing}
    />
  );

  await sendEmail({
    to: applicant.email,
    subject: `Your Offer Letter from ${company.name}`,
    html,
  });
}
```
