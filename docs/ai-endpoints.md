Great — I’ll update your **AI Endpoints Documentation** to reflect your **actual Cloudflare models**, **actual routing logic**, and what **Supabase Edge Functions will actually return**.

Your current version assumes **Llama-3-8B only**, but your Worker uses:

* `@cf/meta/llama-3-8b-instruct` → general tasks
* `@cf/deepseek/deepseek-r1-distill-qwen-32b` → reasoning, ranking, onboarding
* `@cf/baai/bge-large-en-v1.5` → embeddings

So the doc needs to show accurate `"model"` values inside the output.

I’ll also update:

* Results → include `output.response`
* Clarify that Supabase is a passthrough to Cloudflare Worker
* Provide consistent schemas
* Add security note
* Make it production-ready

Here is the **updated version (Correct, Clean, and Production-Aligned)**:

---

# 🧠 **AI Endpoints Documentation — Prolific HR (Supabase + Cloudflare)**

**Version 1.2 — Updated with Cloudflare Worker Routing Logic**
**AI Gateway:** `https://hr-ai-gateway.gridhouse-digital10.workers.dev`
**Base URL (Edge Functions):** `[YOUR_SUPABASE_FUNCTIONS_URL]`

All endpoints below are implemented as **Supabase Edge Functions**, which internally forward requests to the **AI Gateway Worker**.

---

# 1. 🟦 Summarize Applicant

Generates a clean summary of an applicant plus insights.

**Endpoint:** `/ai-summarize-applicant`
**Method:** `POST`
**Auth:** `Bearer <SUPABASE_ANON_KEY>`

### **Task sent to Worker:**

```
summary
```

### Input Schema

```json
{
  "applicant": {
    "first_name": "John",
    "last_name": "Doe",
    "position_applied": "Caregiver",
    "experience": "5 years",
    "skills": ["CPR", "First Aid"]
  }
}
```

### Output Schema

```json
{
  "success": true,
  "model": "@cf/meta/llama-3-8b-instruct",
  "task": "summary",
  "input": { ... },
  "output": {
    "response": "John Doe is a caregiver with 5 years experience..."
  }
}
```

---

# 2. 🟩 Rank Applicants

Ranks candidates using **DeepSeek R1 Distill reasoning model**.

**Endpoint:** `/ai-rank-applicants`
**Method:** `POST`
**Auth:** `Bearer <SUPABASE_ANON_KEY>`

### **Task sent to Worker:**

```
ranking
```

### Input Schema

```json
{
  "candidates": [
    { "id": "1", "name": "Alice", "skills": ["CNA", "CPR"] },
    { "id": "2", "name": "Bob", "skills": ["CPR"] }
  ],
  "job_description": "Looking for an experienced caregiver..."
}
```

### Output Schema

```json
{
  "success": true,
  "model": "@cf/deepseek/deepseek-r1-distill-qwen-32b",
  "task": "ranking",
  "input": { ... },
  "output": {
    "response": "1. Alice - Strong match due to...\n2. Bob - Good match but..."
  }
}
```

---

# 3. 🟧 Draft Offer Letter (React Email Compatible)

Generates **structured JSON only**, which is later rendered by React Email.

**Endpoint:** `/ai-draft-offer-letter`
**Method:** `POST`
**Auth:** `Bearer <SUPABASE_ANON_KEY>`

### **Task sent to Worker:**

```
offer_letter
```

### Input Schema

```json
{
  "employeeName": "Jane Smith",
  "position": "Registered Nurse",
  "rate": "$45/hr",
  "startDate": "2023-11-01"
}
```

### Output Schema

```json
{
  "success": true,
  "model": "@cf/meta/llama-3-8b-instruct",
  "task": "offer_letter",
  "input": { ... },
  "output": {
    "response": {
      "intro": "We are pleased to offer you...",
      "role_details": "Your role as a Registered Nurse...",
      "compensation": "$45/hr...",
      "start_date": "2023-11-01",
      "closing": "We look forward to working with you."
    }
  }
}
```

---

# 4. 🟨 Onboarding Logic

Uses DeepSeek to determine next onboarding steps.

**Endpoint:** `/ai-onboarding-logic`
**Method:** `POST`
**Auth:** `Bearer <SUPABASE_ANON_KEY>`

### **Task sent to Worker:**

```
onboarding_logic
```

### Input Schema

```json
{
  "employee": { "id": "123", "role": "Nurse" },
  "status": { "documents_submitted": true, "background_check": "pending" }
}
```

### Output Schema

```json
{
  "success": true,
  "model": "@cf/deepseek/deepseek-r1-distill-qwen-32b",
  "task": "onboarding_logic",
  "input": { ... },
  "output": {
    "response": "Next Step: Await background check clearance..."
  }
}
```

---

# 5. 🔵 WordPress / LearnDash Validation

Checks group mapping, username rules, preparedness.

**Endpoint:** `/ai-wp-validation`
**Method:** `POST`
**Auth:** `Bearer <SUPABASE_ANON_KEY>`

### **Task sent to Worker:**

```
wp_validation
```

### Input Schema

```json
{
  "group": "Nurses",
  "user": { "email": "jane@example.com", "username": "jane_doe" }
}
```

### Output Schema

```json
{
  "success": true,
  "model": "@cf/deepseek/deepseek-r1-distill-qwen-32b",
  "task": "wp_validation",
  "input": { ... },
  "output": {
    "response": "Validation successful. User 'jane_doe' is ready for enrollment..."
  }
}
```

---

# 🔐 Security Notes

* All Edge Functions require **Bearer Supabase ANON/JWT**
* Cloudflare Worker accepts **POST only**
* No API keys exposed in frontend
* Future:

  * Signed request headers
  * Rate limiting
  * Tenant-based isolation

---

# 🎉 Ready for Integration
