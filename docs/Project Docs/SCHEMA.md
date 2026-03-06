# SCHEMA — HOMS

> Canonical table reference. Updated: 2026-03-06.
> All tables have RLS enabled. All MVP tables have audit triggers.

---

## Conventions
- All tenant-scoped tables: `tenant_id UUID NOT NULL REFERENCES tenants(id)`
- `tenant_id` is ALWAYS read from JWT `app_metadata`, never from request body
- Email deduplication: `UNIQUE (tenant_id, email)` on `people`
- Audit: every write goes to `audit_log` via trigger
- Signed URLs: never stored in DB — regenerate on demand

---

## tenants

```
id          UUID PK
name        TEXT NOT NULL
slug        TEXT UNIQUE NOT NULL       -- used in WP sub-site URLs (post-MVP)
created_at  TIMESTAMPTZ
```

**RLS:**
- `platform_admin`: read/write all
- `tenant_admin` / `hr_admin`: SELECT own tenant only (`id = JWT app_metadata tenant_id`)

---

## tenant_settings

```
tenant_id                    UUID PK FK tenants(id)
wp_site_url                  TEXT
wp_username_encrypted        TEXT       -- pgp_sym_encrypt
wp_app_password_encrypted    TEXT       -- pgp_sym_encrypt
bamboohr_subdomain           TEXT
bamboohr_api_key_encrypted   TEXT       -- pgp_sym_encrypt. NEVER select to frontend.
jazzhr_api_key_encrypted     TEXT       -- pgp_sym_encrypt. NEVER select to frontend.
active_connectors            TEXT[]     -- e.g. ARRAY['bamboohr']
ld_group_mappings            JSONB      -- [{job_title, group_id}]
profile_source               TEXT       -- 'bamboohr' | 'jazzhr'. Set once at connector setup.
created_at                   TIMESTAMPTZ
updated_at                   TIMESTAMPTZ
```

**RLS:** Own tenant only.
**Audit trigger:** `audit_tenant_settings_trigger`
**Critical:** encrypted columns are NEVER selected to the frontend. Read-only fields returned: tenant_id, wp_site_url, bamboohr_subdomain, active_connectors, ld_group_mappings, profile_source.

---

## people

```
id              UUID PK
tenant_id       UUID NOT NULL FK tenants(id)
email           TEXT NOT NULL
first_name      TEXT
last_name       TEXT
job_title       TEXT
type            TEXT NOT NULL DEFAULT 'candidate'   -- 'candidate' | 'employee'
profile_source  TEXT                                -- 'bamboohr' | 'jazzhr'
wp_user_id      INTEGER                             -- set after process-hire
hired_at        TIMESTAMPTZ                         -- NFR-3: set once, NEVER overwritten by sync
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**Unique:** `(tenant_id, email)` — universal deduplication key.
**RLS:** Own tenant only.
**Audit trigger:** `audit_people_trigger`
**Critical:** `hired_at` is set once when hire is first detected. Sync must check: if hired_at IS NOT NULL, skip.

---

## tenant_users

```
id          UUID PK
tenant_id   UUID NOT NULL FK tenants(id)
user_id     UUID NOT NULL FK auth.users(id) ON DELETE CASCADE
role        TEXT NOT NULL   -- 'platform_admin' | 'tenant_admin' | 'hr_admin'
status      TEXT NOT NULL DEFAULT 'active'  -- 'active' | 'pending' | 'deactivated'
invited_by  UUID FK auth.users(id)
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
UNIQUE (tenant_id, user_id)
```

**RLS:** Own tenant only.
**Audit trigger:** `audit_tenant_users_trigger`
**Note:** This is the source of truth for JWT app_metadata claims (via custom_access_token_hook).

---

## integration_log

```
id               UUID PK
tenant_id        UUID NOT NULL FK tenants(id)
source           TEXT NOT NULL     -- 'bamboohr' | 'jazzhr' | 'learndash' | 'jotform'
idempotency_key  TEXT NOT NULL     -- email for hire events; run_id for sync runs
status           TEXT NOT NULL     -- 'hire_detected' | 'processed' | 'failed' | 'skipped'
payload          JSONB
last_received_at TIMESTAMPTZ       -- webhook health
started_at       TIMESTAMPTZ       -- sync run observability
completed_at     TIMESTAMPTZ
rows_processed   INTEGER
error_count      INTEGER
created_at       TIMESTAMPTZ
UNIQUE (tenant_id, source, idempotency_key)
```

**RLS:** Own tenant + platform_admin.
**Critical:** The UNIQUE constraint is the idempotency guard. ON CONFLICT DO NOTHING = skip duplicate hire events.

---

## audit_log

```
id          UUID PK
tenant_id   UUID NOT NULL FK tenants(id)
actor_id    UUID     -- NULL for system-generated
action      TEXT NOT NULL   -- 'INSERT' | 'UPDATE' | 'DELETE'
table_name  TEXT NOT NULL
record_id   UUID
before      JSONB
after       JSONB
created_at  TIMESTAMPTZ
```

**RLS:** INSERT for own tenant. SELECT for own tenant + platform_admin. NO UPDATE. NO DELETE.
**Critical:** Append-only. Tamper-evident. Grows indefinitely — archiving strategy needed post-MVP.

---

## training_records (Epic 4 — NOT YET CREATED)

```
id              UUID PK
tenant_id       UUID NOT NULL FK tenants(id)
person_id       UUID NOT NULL FK people(id)
course_id       TEXT NOT NULL     -- LearnDash course ID
status          TEXT              -- 'not_started' | 'in_progress' | 'completed'
completion_pct  INTEGER
completed_at    TIMESTAMPTZ       -- raw value from LearnDash sync
last_synced_at  TIMESTAMPTZ
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
UNIQUE (tenant_id, person_id, course_id)
```

**Note:** Sync writes here. Never touches training_adjustments.

---

## training_adjustments (Epic 4 — NOT YET CREATED)

```
id              UUID PK
tenant_id       UUID NOT NULL FK tenants(id)
person_id       UUID NOT NULL FK people(id)
course_id       TEXT NOT NULL
field           TEXT NOT NULL     -- which field is overridden
value           TEXT NOT NULL     -- override value
reason          TEXT              -- required: why HR made this adjustment
actor_id        UUID NOT NULL FK auth.users(id)
created_at      TIMESTAMPTZ       -- append-only, no updates
```

**RLS:** INSERT only for tenant_admin/hr_admin. SELECT own tenant. NO UPDATE. NO DELETE.
**Critical:** Effective compliance value = latest adjustment for (person_id, course_id, field) if exists, else training_records value.

---

## training_events (Epic 4 — NOT YET CREATED)

```
id          UUID PK
tenant_id   UUID NOT NULL FK tenants(id)
person_id   UUID NOT NULL FK people(id)
event_type  TEXT NOT NULL   -- 'enrolled' | 'completed' | 'expired' | 'adjusted'
payload     JSONB
created_at  TIMESTAMPTZ
```

**RLS:** INSERT only. SELECT own tenant. NO UPDATE. NO DELETE. Immutable audit trail.

---

## Legacy tables (pre-multitenant, Epic 0)

> These exist in the DB but are NOT tenant_id-scoped in RLS. Used by Prolific Homecare only until Epic 5 refactor.

- `applicants` — JotForm applicant records
- `applicants_archive` — archived applicants
- `offers` — job offers
- `offers_archive` — archived offers
- `profiles` — user profiles (role: admin/hr/staff)
- `ai_logs` — AI + JotForm API call logs
- `settings` — legacy single-tenant settings
