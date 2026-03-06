# pg_cron Setup Guide - Data Retention Automation

## Overview

This guide walks through setting up automated daily cleanup of old applicant records using PostgreSQL's `pg_cron` extension in Supabase.

**What it does:**
- Runs daily at 2 AM
- Archives applicants older than 3 months (excluding Hired/Offer status)
- Calls the `cleanup-old-submissions` Edge Function
- Logs results to `ai_logs` table

---

## Prerequisites

✅ Phase 2 migrations applied (archive tables created)
✅ `cleanup-old-submissions` Edge Function deployed
✅ Tested cleanup function manually (verified it works)

---

## Step 1: Enable pg_cron Extension

### Option A: Via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **Database** → **Extensions**
2. Search for `pg_cron`
3. Click **Enable** next to `pg_cron`

### Option B: Via SQL Editor

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
-- Expected: 1 row
```

---

## Step 2: Get Your Project Credentials

You'll need:

1. **Supabase Project URL**
   - Dashboard → Settings → API → Project URL
   - Format: `https://[project-ref].supabase.co`

2. **Service Role Key** (optional, for authentication)
   - Dashboard → Settings → API → Service Role Key (secret)
   - ⚠️ Keep this secret! Never commit to git.

---

## Step 3: Schedule the Cleanup Job

### Option A: Simple Scheduling (No Auth Required)

If your Edge Function accepts unauthenticated requests:

```sql
SELECT cron.schedule(
  'cleanup-old-applicants',         -- Job name
  '0 2 * * *',                      -- Cron expression: 2 AM daily
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Replace `[YOUR-PROJECT-REF]`** with your actual project reference.

---

### Option B: With Service Role Authentication (Recommended)

For secure production environments:

```sql
SELECT cron.schedule(
  'cleanup-old-applicants',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer [YOUR-SERVICE-ROLE-KEY]'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Security Note:** Replace `[YOUR-SERVICE-ROLE-KEY]` with actual key. Consider using Supabase Vault for secrets (see Option C).

---

### Option C: Using Supabase Vault (Most Secure)

**Step 1: Store service role key in Vault**

```sql
-- Store secret in Vault
INSERT INTO vault.secrets (name, secret)
VALUES ('service_role_key', '[YOUR-SERVICE-ROLE-KEY]');
```

**Step 2: Schedule job using Vault secret**

```sql
SELECT cron.schedule(
  'cleanup-old-applicants',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Step 4: Verify Job Creation

```sql
-- List all scheduled jobs
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job;
```

**Expected output:**
```
jobid | jobname                  | schedule    | command                     | active
------|--------------------------|-------------|-----------------------------|-------
1     | cleanup-old-applicants   | 0 2 * * *   | SELECT net.http_post(...)   | t
```

---

## Step 5: Test Manual Execution

Before waiting for 2 AM, test the job manually:

```sql
-- Manually trigger the job
SELECT cron.schedule(
  'test-cleanup-now',
  '* * * * *',  -- Every minute (for testing only)
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Wait 1-2 minutes, then check run history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'test-cleanup-now')
ORDER BY start_time DESC
LIMIT 5;

-- Clean up test job
SELECT cron.unschedule('test-cleanup-now');
```

---

## Step 6: Monitor Job Execution

### View Job Run History

```sql
SELECT
  runid,
  jobid,
  database,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time AS duration
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-applicants'
)
ORDER BY start_time DESC
LIMIT 10;
```

**Expected fields:**
- `status`: Should be `'succeeded'`
- `return_message`: Should contain HTTP response or request ID
- `duration`: Typically < 5 seconds

---

### View Cleanup Results in ai_logs

```sql
SELECT
  created_at,
  success,
  metadata->>'archived_applicants' AS archived_count,
  metadata->>'archived_offers' AS offers_count,
  metadata->>'cutoff_date' AS cutoff_date,
  metadata->>'error' AS error_message
FROM ai_logs
WHERE feature = 'data_retention_cleanup'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Step 7: Verify Cleanup is Working

### Pre-Cleanup Check

```sql
-- Count applicants that SHOULD be archived
SELECT COUNT(*) AS should_be_archived
FROM applicants
WHERE created_at < NOW() - INTERVAL '3 months'
  AND status NOT IN ('Hired', 'Offer');
```

### Post-Cleanup Check

Wait for cleanup to run (after 2 AM), then:

```sql
-- Should be 0 (all archived)
SELECT COUNT(*) AS remaining_old_applicants
FROM applicants
WHERE created_at < NOW() - INTERVAL '3 months'
  AND status NOT IN ('Hired', 'Offer');

-- Should have new records
SELECT COUNT(*) AS total_archived
FROM applicants_archive
WHERE archived_at > NOW() - INTERVAL '1 day';
```

---

## Cron Expression Reference

The schedule `'0 2 * * *'` means:
- `0` - At minute 0
- `2` - At hour 2 (2 AM)
- `*` - Every day of month
- `*` - Every month
- `*` - Every day of week

**Other useful schedules:**

```sql
'0 2 * * *'     -- Daily at 2 AM
'0 2 * * 0'     -- Weekly on Sunday at 2 AM
'0 2 1 * *'     -- Monthly on the 1st at 2 AM
'0 */6 * * *'   -- Every 6 hours
'*/15 * * * *'  -- Every 15 minutes (testing only)
```

Test your cron expressions: https://crontab.guru/

---

## Troubleshooting

### Issue 1: Extension Not Available

**Error:** `extension "pg_cron" does not exist`

**Solution:**
- Contact Supabase support to enable `pg_cron` for your project
- OR use Supabase Dashboard → Database → Extensions to enable it
- Some plans may not support `pg_cron` (check your plan tier)

---

### Issue 2: Job Not Running

**Symptoms:**
- No entries in `cron.job_run_details`
- Cleanup not happening

**Debugging:**

```sql
-- Check if job is active
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-applicants';
-- Verify active = true

-- Check for errors in pg_cron logs
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

**Common causes:**
1. Job inactive: Re-schedule the job
2. Invalid cron expression: Verify syntax
3. Edge Function URL incorrect: Check project reference

---

### Issue 3: Job Runs But Function Fails

**Symptoms:**
- `cron.job_run_details` shows `status = 'succeeded'`
- BUT `ai_logs` shows `success = false`

**Debugging:**

```bash
# Check Edge Function logs
supabase functions logs cleanup-old-submissions --tail
```

**Common causes:**
1. Authentication error (if using service role key)
2. Database permissions issue
3. Archive table doesn't exist

**Fix:**
- Verify service role key is correct
- Check RLS policies on archive tables
- Re-run migrations if tables missing

---

### Issue 4: Job Runs Multiple Times

**Symptoms:**
- Multiple entries in `cron.job_run_details` within 1 minute
- Duplicate cleanup operations

**Cause:** Multiple jobs with same name OR incorrect cron expression

**Solution:**

```sql
-- Remove duplicate jobs
SELECT cron.unschedule('cleanup-old-applicants');

-- Re-create with correct schedule
SELECT cron.schedule(
  'cleanup-old-applicants',
  '0 2 * * *',  -- Verify this is correct
  $$ ... $$
);
```

---

## Unscheduling the Job

If you need to disable automatic cleanup:

```sql
-- Remove the scheduled job
SELECT cron.unschedule('cleanup-old-applicants');

-- Verify removal
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-applicants';
-- Expected: 0 rows
```

**To re-enable:** Re-run the scheduling command from Step 3.

---

## Changing the Schedule

To run cleanup at a different time:

```sql
-- First, unschedule existing job
SELECT cron.unschedule('cleanup-old-applicants');

-- Schedule with new time (e.g., 3 AM instead of 2 AM)
SELECT cron.schedule(
  'cleanup-old-applicants',
  '0 3 * * *',  -- 3 AM daily
  $$ ... $$
);
```

---

## Best Practices

### 1. Set Up Monitoring Alerts

Create a daily check to ensure cleanup runs successfully:

```sql
-- Query for last 7 days of cleanup runs
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS runs,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS failed
FROM ai_logs
WHERE feature = 'data_retention_cleanup'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Set up alert:** If `failed > 0` for any day, notify admin.

---

### 2. Log Retention for Cron Jobs

`cron.job_run_details` can grow large over time. Consider cleaning old logs:

```sql
-- Delete job run logs older than 90 days
DELETE FROM cron.job_run_details
WHERE start_time < NOW() - INTERVAL '90 days';
```

**Schedule this cleanup too:**

```sql
SELECT cron.schedule(
  'cleanup-cron-logs',
  '0 3 1 * *',  -- Monthly at 3 AM on the 1st
  $$
  DELETE FROM cron.job_run_details
  WHERE start_time < NOW() - INTERVAL '90 days';
  $$
);
```

---

### 3. Backup Before First Run

Before enabling automatic cleanup in production:

```sql
-- Backup applicants table
CREATE TABLE applicants_backup AS SELECT * FROM applicants;

-- Backup offers table
CREATE TABLE offers_backup AS SELECT * FROM offers;
```

**After verifying cleanup works correctly for 1 week, drop backups:**

```sql
DROP TABLE applicants_backup;
DROP TABLE offers_backup;
```

---

## Alternative: Manual Cleanup (No pg_cron)

If `pg_cron` is not available, you can:

### Option 1: GitHub Actions

Create `.github/workflows/cleanup-applicants.yml`:

```yaml
name: Daily Cleanup Old Applicants

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:      # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cleanup Function
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/cleanup-old-submissions \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}'
```

**Secrets to add in GitHub repo:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### Option 2: Vercel Cron (if using Vercel)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cleanup-applicants",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Create `pages/api/cleanup-applicants.ts`:

```typescript
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/cleanup-old-submissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  return res.status(200).json(data);
}
```

---

### Option 3: Manual Script (Run Locally)

Create `scripts/cleanup-applicants.sh`:

```bash
#!/bin/bash

# Load environment variables
source .env

# Trigger cleanup
curl -X POST "$SUPABASE_URL/functions/v1/cleanup-old-submissions" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Schedule with system cron (Linux/Mac):**

```bash
# Edit crontab
crontab -e

# Add this line (adjust path):
0 2 * * * /path/to/scripts/cleanup-applicants.sh >> /var/log/cleanup.log 2>&1
```

---

## Summary

### Quick Setup (5 minutes)

1. Enable `pg_cron` extension in Supabase Dashboard
2. Get your project URL from Dashboard → Settings → API
3. Run this SQL:

```sql
SELECT cron.schedule(
  'cleanup-old-applicants',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

4. Verify: `SELECT * FROM cron.job;`
5. Monitor: `SELECT * FROM ai_logs WHERE feature = 'data_retention_cleanup';`

**Done!** Cleanup will run automatically at 2 AM daily.

---

**Last Updated:** December 4, 2025
**Status:** Ready for Production
**Support:** Check [PHASE_2_VERIFICATION_GUIDE.md](PHASE_2_VERIFICATION_GUIDE.md) for troubleshooting
