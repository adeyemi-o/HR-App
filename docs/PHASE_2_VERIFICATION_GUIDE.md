# Phase 2 Verification & Monitoring Guide

## ✅ Implementation Status

**Phase 2 Complete** - December 4, 2025

All components have been successfully deployed:
- ✅ Data retention cleanup with archival
- ✅ File storage migration (JotForm → Supabase)
- ✅ Database migrations applied
- ✅ Edge Functions deployed
- ✅ Storage buckets configured

---

## 1. Verification Checklist

### Database Tables

**Run these queries in Supabase SQL Editor:**

```sql
-- Verify archive tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name IN ('applicants_archive', 'offers_archive');

-- Expected: 2 rows (both tables should exist)
```

```sql
-- Verify RLS policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('applicants_archive', 'offers_archive');

-- Expected: 2 rows (Admin access policies)
```

### Storage Buckets

**Check via Supabase Dashboard:**

1. Go to **Storage** section
2. Verify buckets exist:
   - ✅ `resumes` (private)
   - ✅ `compliance-documents` (private)

**Or query via SQL:**

```sql
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id IN ('resumes', 'compliance-documents');

-- Expected: 2 rows
```

### Edge Functions

**Check deployment status:**

```bash
supabase functions list
```

**Expected output:**
```
cleanup-old-submissions (deployed)
listApplicants (deployed)
jotform-webhook (deployed)
getApplicantDetails (deployed)
```

---

## 2. Testing Procedures

### Test 1: File Migration (Webhook)

**Steps:**
1. Submit a test application via JotForm (with resume upload if available)
2. Wait 10 seconds
3. Check applicant record in Supabase

**Query to verify:**
```sql
SELECT
  first_name,
  last_name,
  email,
  resume_url,
  created_at
FROM applicants
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- If resume was uploaded: `resume_url` should be a storage path like `submissionID/filename.pdf` (NOT a JotForm URL)
- If no resume: `resume_url` should be NULL

**Check function logs:**
```bash
supabase functions logs jotform-webhook --tail
```

**Expected output:**
```
[Webhook] Migrating file for applicant: test@example.com
[FileManager] Downloading: https://files.jotform.com/...
[FileManager] Uploading to: resumes/submissionID/file.pdf
[FileManager] File migrated successfully: submissionID/file.pdf
[Webhook] File migrated: submissionID/file.pdf
```

---

### Test 2: File Migration (List Sync)

**Steps:**
1. Manually trigger applicant list sync from the UI
2. Check function logs

**Query before sync:**
```sql
SELECT
  id,
  email,
  resume_url
FROM applicants
WHERE resume_url LIKE '%jotform%' OR resume_url LIKE '%jotformcdn%';
```

**Run sync, then check logs:**
```bash
supabase functions logs listApplicants --tail
```

**Expected output:**
```
[listApplicants] Migrating file for applicant: john@example.com
[FileManager] Downloading: https://...
[FileManager] File migrated successfully: ...
```

**Query after sync:**
```sql
-- Should return 0 rows (all JotForm URLs migrated)
SELECT
  id,
  email,
  resume_url
FROM applicants
WHERE resume_url LIKE '%jotform%' OR resume_url LIKE '%jotformcdn%';
```

---

### Test 3: Data Retention Cleanup (Manual Run)

**IMPORTANT:** This will DELETE old applicants. Only run in test environment or verify data first.

**Pre-flight check:**
```sql
-- See what WOULD be archived (dry run)
SELECT
  id,
  first_name,
  last_name,
  email,
  status,
  created_at,
  AGE(NOW(), created_at) as age
FROM applicants
WHERE created_at < NOW() - INTERVAL '3 months'
  AND status NOT IN ('Hired', 'Offer')
ORDER BY created_at DESC;
```

**Manual trigger:**
```bash
curl -X POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions \
  -H "Authorization: Bearer [YOUR-ANON-KEY]"
```

**Expected response:**
```json
{
  "success": true,
  "archived_applicants": 5,
  "archived_offers": 2,
  "cutoff_date": "2024-09-04T10:30:00.000Z",
  "message": "Successfully archived and purged 5 old applicants"
}
```

**Verify archive:**
```sql
-- Check archived records
SELECT
  first_name,
  last_name,
  email,
  status,
  archived_at,
  archive_reason
FROM applicants_archive
ORDER BY archived_at DESC
LIMIT 10;
```

**Verify main table:**
```sql
-- Should NOT contain archived IDs
SELECT COUNT(*) as remaining_old_applicants
FROM applicants
WHERE created_at < NOW() - INTERVAL '3 months'
  AND status NOT IN ('Hired', 'Offer');

-- Expected: 0
```

---

### Test 4: Storage Access (Signed URLs)

**Test generating signed URLs:**

```sql
-- Get a storage path from an applicant
SELECT id, first_name, last_name, resume_url
FROM applicants
WHERE resume_url IS NOT NULL
  AND resume_url NOT LIKE '%jotform%'
LIMIT 1;
```

**Use the `resume_url` value in this test:**

```typescript
// In a Supabase Edge Function or client code:
import { getSignedUrl } from '../_shared/file-manager.ts';

const signedUrl = await getSignedUrl(
  'submissionID/filename.pdf', // From resume_url column
  'resumes',
  supabase,
  3600 // 1 hour expiry
);

console.log('Signed URL:', signedUrl);
// Expected: https://[project].supabase.co/storage/v1/object/sign/resumes/...?token=...
```

**Test file access:**
```bash
# Copy the signed URL and paste in browser
# Expected: File should download
```

---

## 3. Monitoring Queries

### Query 1: File Migration Success Rate

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_applicants,
  COUNT(CASE WHEN resume_url IS NOT NULL THEN 1 END) as with_resumes,
  COUNT(CASE WHEN resume_url LIKE '%jotform%' THEN 1 END) as jotform_urls,
  COUNT(CASE WHEN resume_url NOT LIKE '%jotform%' AND resume_url IS NOT NULL THEN 1 END) as migrated_files
FROM applicants
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Expected:**
- `jotform_urls` should be 0 (all migrated)
- `migrated_files` should match `with_resumes`

---

### Query 2: Cleanup Job Success Rate

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_runs,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  ROUND(AVG((metadata->>'archived_applicants')::numeric), 2) as avg_archived_per_run
FROM ai_logs
WHERE feature = 'data_retention_cleanup'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Expected:**
- `success_rate` should be ≥ 95%
- `failed` should be 0

---

### Query 3: Storage Usage

```sql
SELECT
  bucket_id,
  COUNT(*) as file_count,
  ROUND(SUM((metadata->>'size')::numeric) / 1024 / 1024, 2) as total_size_mb,
  MIN(created_at) as oldest_file,
  MAX(created_at) as newest_file
FROM storage.objects
WHERE bucket_id IN ('resumes', 'compliance-documents')
GROUP BY bucket_id;
```

**Expected:**
- `resumes` bucket should have files if migrations occurred
- `total_size_mb` should be reasonable (monitor for growth)

---

### Query 4: Archive Statistics

```sql
SELECT
  DATE(archived_at) as date,
  archive_reason,
  COUNT(*) as total_archived,
  COUNT(DISTINCT status) as unique_statuses
FROM applicants_archive
WHERE archived_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(archived_at), archive_reason
ORDER BY date DESC;
```

**Expected:**
- `archive_reason` should be '3-month retention policy'
- `total_archived` should match cleanup job logs

---

### Query 5: API Call Efficiency (JotForm)

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_api_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(AVG(CAST(metadata->>'duration' AS NUMERIC)), 2) as avg_duration_ms,
  SUM(CASE WHEN metadata->>'statusCode' = '429' THEN 1 ELSE 0 END) as rate_limited
FROM ai_logs
WHERE feature = 'jotform_api'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Expected:**
- `total_api_calls` should be low (< 50/day with webhooks)
- `rate_limited` should be 0

---

## 4. pg_cron Scheduling

### Check if pg_cron is Enabled

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Expected:** 1 row (extension installed)

**If NOT installed:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

### Schedule Cleanup Job (2 AM Daily)

```sql
SELECT cron.schedule(
  'cleanup-old-applicants',
  '0 2 * * *', -- 2 AM daily (cron format)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/cleanup-old-submissions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**IMPORTANT:** Replace placeholders:
- `current_setting('app.settings.supabase_url', true)` → Your Supabase project URL
- `current_setting('app.settings.service_role_key', true)` → Service role key (use secrets)

**Safer approach using environment variables:**

```sql
-- First, set environment variables in Supabase Dashboard → Settings → Vault
-- Then reference them:

SELECT cron.schedule(
  'cleanup-old-applicants',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

---

### View Scheduled Jobs

```sql
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'cleanup-old-applicants';
```

**Expected:** 1 row with `active = true`

---

### View Job Run History

```sql
SELECT
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-applicants'
)
ORDER BY start_time DESC
LIMIT 10;
```

**Expected:**
- `status` should be 'succeeded'
- `return_message` should contain request ID or success message

---

### Unschedule Job (If Needed)

```sql
SELECT cron.unschedule('cleanup-old-applicants');
```

---

## 5. Error Scenarios & Troubleshooting

### Issue 1: File Migration Failing

**Symptoms:**
- `resume_url` still contains JotForm URLs
- Logs show migration errors

**Check logs:**
```bash
supabase functions logs jotform-webhook --tail
supabase functions logs listApplicants --tail
```

**Common causes:**
1. **JotForm file URL expired**
   - Error: `Failed to download file: HTTP 403`
   - Solution: File URLs expire after 6 months. No fix (file lost).

2. **Storage bucket permissions**
   - Error: `Upload failed: new row violates row-level security policy`
   - Solution: Check RLS policies on `storage.objects`

3. **Network timeout**
   - Error: `fetch failed`
   - Solution: Retry will happen automatically (exponential backoff)

**Verify storage policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

---

### Issue 2: Cleanup Job Not Running

**Symptoms:**
- Old applicants (> 3 months) still in main table
- No records in `applicants_archive`

**Check pg_cron status:**
```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-applicants';
```

**If job doesn't exist:** Schedule it (see section 4)

**If job exists but not running:**
```sql
-- Check last run
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-applicants')
ORDER BY start_time DESC
LIMIT 1;
```

**If `status = 'failed'`:**
- Check `return_message` for error details
- Common issue: Edge Function URL incorrect
- Fix: Update cron job with correct URL

---

### Issue 3: Archive Tables Empty

**Symptoms:**
- Cleanup job runs successfully
- `ai_logs` shows `archived_applicants: 0`
- No old applicants to archive

**Verify there ARE old applicants:**
```sql
SELECT COUNT(*) as old_applicants
FROM applicants
WHERE created_at < NOW() - INTERVAL '3 months'
  AND status NOT IN ('Hired', 'Offer');
```

**If count is 0:** No issue - no old applicants to archive.

**If count > 0:** Cleanup job should have archived them. Check:
1. Edge Function logs for errors
2. RLS policies on archive tables (might be blocking inserts)

---

### Issue 4: Storage Quota Exceeded

**Symptoms:**
- File migration fails with `Upload failed: storage quota exceeded`

**Check storage usage:**
```sql
SELECT
  bucket_id,
  ROUND(SUM((metadata->>'size')::numeric) / 1024 / 1024 / 1024, 2) as total_size_gb
FROM storage.objects
GROUP BY bucket_id;
```

**Solution:**
1. Upgrade Supabase plan (increase storage quota)
2. Delete old files from archive (if applicable)
3. Implement file retention cleanup for storage

---

## 6. Success Metrics (Weekly Review)

### Metric 1: File Migration Rate

**Target:** ≥ 95% of files migrated from JotForm

```sql
SELECT
  ROUND(100.0 * COUNT(CASE WHEN resume_url NOT LIKE '%jotform%' AND resume_url IS NOT NULL THEN 1 END) /
    NULLIF(COUNT(CASE WHEN resume_url IS NOT NULL THEN 1 END), 0), 2) as migration_rate_percent
FROM applicants;
```

**Expected:** ≥ 95%

---

### Metric 2: Cleanup Success Rate

**Target:** ≥ 99% successful cleanup runs

```sql
SELECT
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM ai_logs
WHERE feature = 'data_retention_cleanup'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Expected:** ≥ 99%

---

### Metric 3: Data Retention Compliance

**Target:** 0 applicants older than 3 months (excluding Hired/Offer)

```sql
SELECT COUNT(*) as non_compliant_records
FROM applicants
WHERE created_at < NOW() - INTERVAL '3 months'
  AND status NOT IN ('Hired', 'Offer');
```

**Expected:** 0

---

### Metric 4: Archive Integrity

**Target:** All archived records have matching original data

```sql
-- Verify no data loss during archival
SELECT
  aa.id,
  aa.email,
  aa.archived_at
FROM applicants_archive aa
LEFT JOIN applicants a ON aa.id = a.id
WHERE aa.archived_at > NOW() - INTERVAL '7 days'
  AND a.id IS NULL; -- Should be NULL (archived record no longer in main table)
```

**Expected:** All rows should have `a.id IS NULL` (confirming deletion)

---

### Metric 5: Storage Growth Rate

**Target:** Monitor for unexpected growth

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as files_added,
  ROUND(SUM((metadata->>'size')::numeric) / 1024 / 1024, 2) as size_added_mb
FROM storage.objects
WHERE bucket_id = 'resumes'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Expected:** Steady growth matching applicant submission rate

---

## 7. Rollback Procedures

### Rollback 1: Disable pg_cron Job

**When:** Cleanup job causing issues

```sql
SELECT cron.unschedule('cleanup-old-applicants');
```

**Verify:**
```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-applicants';
-- Expected: 0 rows
```

---

### Rollback 2: Restore Archived Applicants

**When:** Accidental deletion or need to recover data

```sql
-- Restore specific applicant
INSERT INTO applicants (
  id, airtable_id, jotform_id, first_name, last_name, email, phone,
  position_applied, status, resume_url, wp_user_id, created_at, updated_at
)
SELECT
  id, airtable_id, jotform_id, first_name, last_name, email, phone,
  position_applied, status, resume_url, wp_user_id, created_at, updated_at
FROM applicants_archive
WHERE email = 'john@example.com';

-- Restore related offers
INSERT INTO offers (
  id, applicant_id, status, position_title, start_date, salary,
  offer_letter_url, secure_token, created_by, created_at, updated_at,
  expires_at, signed_at
)
SELECT
  id, applicant_id, status, position_title, start_date, salary,
  offer_letter_url, secure_token, created_by, created_at, updated_at,
  expires_at, signed_at
FROM offers_archive
WHERE applicant_id = (SELECT id FROM applicants WHERE email = 'john@example.com');
```

---

### Rollback 3: Revert Edge Functions

**When:** File migration or cleanup causing issues

```bash
# Revert to previous version
git log --oneline supabase/functions/listApplicants/index.ts
git checkout [previous-commit-hash] supabase/functions/listApplicants/index.ts
git checkout [previous-commit-hash] supabase/functions/jotform-webhook/index.ts

# Re-deploy
supabase functions deploy listApplicants
supabase functions deploy jotform-webhook
```

---

### Rollback 4: Drop Archive Tables (Nuclear Option)

**DANGER:** This deletes ALL archived data permanently.

```sql
-- Only use if absolutely necessary
DROP TABLE offers_archive CASCADE;
DROP TABLE applicants_archive CASCADE;
```

---

## 8. Recommended Alerts

Set up alerts in Supabase Dashboard → Settings → Alerts:

1. **Storage Quota Alert**
   - Trigger: Storage > 80% of quota
   - Action: Email admin

2. **Cleanup Failure Alert**
   - Trigger: `ai_logs` WHERE `feature = 'data_retention_cleanup' AND success = false`
   - Action: Email admin + Slack notification

3. **File Migration Failure Spike**
   - Trigger: > 10 file migration errors in 1 hour
   - Action: Email admin

4. **Database Growth Alert**
   - Trigger: `applicants` table row count > threshold
   - Action: Review retention policy compliance

---

## 9. Daily Monitoring Routine

### Morning Check (5 minutes)

1. **Check cleanup job ran successfully:**
   ```sql
   SELECT * FROM ai_logs
   WHERE feature = 'data_retention_cleanup'
     AND created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

2. **Verify no pending migrations:**
   ```sql
   SELECT COUNT(*) as jotform_urls_remaining
   FROM applicants
   WHERE resume_url LIKE '%jotform%';
   ```
   Expected: 0

3. **Check storage health:**
   ```bash
   # Supabase Dashboard → Storage → Check usage percentage
   ```

---

### Weekly Review (15 minutes)

1. Run all 5 Success Metrics queries (Section 6)
2. Review archive statistics (Query 4)
3. Check for any error patterns in `ai_logs`
4. Verify pg_cron job run history

---

## 10. Documentation References

- **Phase 2 Plan:** [PHASE_2_IMPLEMENTATION_PLAN.md](PHASE_2_IMPLEMENTATION_PLAN.md)
- **Deployment Checklist:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Integration Summary:** [JOTFORM_INTEGRATION_SUMMARY.md](JOTFORM_INTEGRATION_SUMMARY.md)
- **Webhook Setup:** [JOTFORM_WEBHOOK_SETUP.md](JOTFORM_WEBHOOK_SETUP.md)
- **Webhook Report:** [WEBHOOK_IMPLEMENTATION_REPORT.md](WEBHOOK_IMPLEMENTATION_REPORT.md)

---

**Last Updated:** December 4, 2025
**Status:** ✅ Phase 2 Complete & Ready for Production
**Next Review:** December 11, 2025
