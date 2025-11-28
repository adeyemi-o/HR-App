# Architecture - Prolific HR Command Centre

## Executive Summary

The Prolific HR Command Centre is a **"Hub and Spoke"** system designed to centralize HR operations. It is built as a **Single Page Application (SPA)** using **React and Vite**, optimized for desktop use by HR staff.

**Supabase** serves as the central "Hub" (Database & Auth), while **Airtable** (Applicant Intake) and **WordPress/LearnDash** (Employee Training) act as "Spokes". Automation between these systems is handled by **n8n/Zapier** webhooks, ensuring a seamless event-driven flow.

## Project Initialization

We will use the standard Vite starter with TypeScript:

```bash
npm create vite@latest prolific-hr-app -- --template react-ts
# Additional setup
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Decision Summary

| Category | Decision | Version | Rationale |
| -------- | -------- | ------- | --------- |
| **Frontend Framework** | **React + Vite** | v18 / v5 | Lightweight, fast build times, perfect for SPAs. |
| **Language** | **TypeScript** | v5.x | Type safety is critical for complex data models (Applicants/Employees). |
| **Backend / DB** | **Supabase** | - | Provides Auth, Postgres DB, and Realtime subscriptions out of the box. |
| **Styling** | **Tailwind CSS** | v3.4 | Utility-first styling for rapid UI development. |
| **UI Components** | **shadcn/ui** | latest | Accessible, customizable components based on Radix UI. |
| **State / Fetching** | **TanStack Query** | v5 | Essential for caching Supabase data and handling loading/error states. |
| **Routing** | **React Router** | v6 | Standard client-side routing. |
| **Forms** | **React Hook Form** | v7 | Performance-focused form handling for complex HR forms. |
| **Validation** | **Zod** | v3 | Schema validation for forms and API responses. |
| **Icons** | **Lucide React** | latest | Clean, consistent icon set. |

## Project Structure

```
prolific-hr-app/
├── src/
│   ├── assets/            # Static assets (images, fonts)
│   ├── components/        # Shared UI components
│   │   ├── ui/            # shadcn/ui primitives (Button, Input)
│   │   ├── layout/        # Layout components (Sidebar, Header)
│   │   └── shared/        # Reusable business components (StatusBadge)
│   ├── features/          # Feature-based modules (The "Slices")
│   │   ├── auth/          # Login, ProtectedRoute
│   │   ├── applicants/    # ApplicantList, ApplicantDetail, hooks
│   │   ├── offers/        # OfferGenerator, OfferList
│   │   └── employees/     # EmployeeList, OnboardingProgress
│   ├── hooks/             # Global hooks (useSupabase, useToast)
│   ├── lib/               # Utility functions & configs
│   │   ├── supabase.ts    # Supabase client instance
│   │   └── utils.ts       # Helper functions
│   ├── pages/             # Route components (Lazy loaded)
│   ├── services/          # API service layer (Supabase queries)
│   ├── types/             # Global TypeScript definitions (Database types)
│   ├── App.tsx            # Main app component & providers
│   └── main.tsx           # Entry point
├── supabase/              # Supabase local config & migrations
├── public/                # Public static files
└── ...config files
```

## Database Schema (Supabase)

### 1. `applicants` Table
*Master record for candidates synced from Airtable.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `airtable_id` | Text | External ID for sync |
| `first_name` | Text | |
| `last_name` | Text | |
| `email` | Text | Unique |
| `phone` | Text | |
| `position_applied` | Text | |
| `status` | Text | Enum: New, Screening, Interview, Offer, Hired, Rejected |
| `resume_url` | Text | Link to file |
| `created_at` | Timestamptz | |

### 2. `offers` Table
*Manages the offer lifecycle.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `applicant_id` | UUID | FK to applicants.id |
| `status` | Text | Enum: Draft, Pending_Approval, Sent, Accepted, Declined |
| `offer_letter_url` | Text | PDF path in Storage |
| `secure_token` | Text | Unique token for public access link |
| `expires_at` | Timestamptz | |
| `signed_at` | Timestamptz | |
| `created_by` | UUID | FK to auth.users (HR Staff) |

### 3. `employees` Table
*Active staff records.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `applicant_id` | UUID | FK to applicants.id (Origin) |
| `wp_user_id` | Int | External ID from WordPress |
| `email` | Text | |
| `status` | Text | Enum: Onboarding, Active, Terminated |
| `onboarding_status` | Text | Enum: Not Started, In Progress, Complete |
| `compliance_status` | Text | Enum: Compliant, Non-Compliant |

### 4. `compliance_docs` Table
*Tracks expiration of critical docs.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `employee_id` | UUID | FK to employees.id |
| `doc_type` | Text | Enum: License, TB_Test, CPR |
| `file_url` | Text | |
| `expiration_date` | Date | |
| `verified_at` | Timestamptz | |

## Integration Architecture

### 1. Inbound: Airtable → Supabase
*   **Trigger:** New Record in Airtable View "Ready for HR".
*   **Mechanism:** n8n Webhook.
*   **Action:** Upsert row in `applicants` table.

### 2. Outbound: Offer Accepted → WordPress
*   **Trigger:** `offers` table update (status = 'Accepted').
*   **Mechanism:** Supabase Database Webhook calls n8n.
*   **Action:**
    1.  Create WP User (REST API).
    2.  Add to LearnDash Group (REST API).
    3.  Update `employees` table with `wp_user_id`.

### 3. Live View: Employee Dashboard
*   **Mechanism:** Client-side fetch (React Query).
*   **Action:** Call Next.js API Route (or Edge Function) -> Call WP REST API `/ldlms/v2/users/{id}/course-progress`.
*   **Reason:** We do NOT store granular lesson progress in Supabase; we fetch it live to ensure accuracy.

## Security Architecture

*   **Authentication:** Supabase Auth (Email/Password).
*   **Authorization (RLS):**
    *   `applicants`, `offers`, `employees`: Read/Write for role 'hr_admin' and 'hr_staff'.
    *   `offers` (Public View): Read-only for 'anon' IF `secure_token` matches (via Edge Function or RLS policy with security definer).
*   **Storage:** Private buckets for Resumes and Compliance Docs. Signed URLs generated for UI access.

## Implementation Patterns

### Consistency Rules
*   **Naming:** `camelCase` for JS/TS, `snake_case` for Database columns.
*   **Dates:** Store as UTC ISO strings. Display using `date-fns` with local formatting.
*   **Errors:** All API calls wrapped in `try/catch` with standardized Toast notifications for user feedback.

### Code Organization
*   **Feature Folders:** Keep related code together (e.g., `features/applicants` contains the components, types, and hooks for that domain).
*   **Service Layer:** UI components NEVER call `supabase.from()` directly. They call `services/applicantService.ts` which handles the query.

---
_Generated by BMad Architect Agent_
