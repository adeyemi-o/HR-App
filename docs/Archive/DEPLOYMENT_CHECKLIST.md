# JotForm Integration - Deployment Checklist

## ✅ Phase 1: Webhooks & Real-Time Sync (COMPLETE)

Phase 1 was successfully deployed on December 4, 2025. See [WEBHOOK_IMPLEMENTATION_REPORT.md](WEBHOOK_IMPLEMENTATION_REPORT.md) for details.

---

## 🚀 Phase 2: Data Retention & File Storage (NEW)

### Pre-Deployment

- [ ] **Phase 1 Complete** - Webhooks working correctly
- [ ] Review Phase 2 code changes in:
  - `supabase/functions/_shared/jotform-client.ts` (already deployed)
  - `supabase/functions/_shared/file-manager.ts` (NEW)
  - `supabase/functions/jotform-webhook/index.ts` (updated)
  - `supabase/functions/listApplicants/index.ts` (updated)
  - `supabase/functions/cleanup-old-submissions/index.ts` (NEW)
  - `supabase/migrations/20251204000000_create_applicants_archive.sql` (NEW)
  - `supabase/migrations/20251204000001_create_storage_buckets.sql` (NEW)

- [ ] Verify Supabase CLI installed and authenticated:
  ```bash
  supabase --version
  supabase link --project-ref [YOUR-PROJECT-REF]
  ```

- [ ] Backup current data (CRITICAL):
  ```sql
  -- Run in Supabase SQL Editor
  CREATE TABLE applicants_backup AS SELECT * FROM applicants;
  CREATE TABLE offers_backup AS SELECT * FROM offers;
  ```

---

## Phase 2 Deployment Steps

### 1. Apply Database Migrations (3 min)

```bash
# Apply migrations for archive tables and storage buckets
supabase db push
```

**Verify:**
```sql
-- Check archive tables created
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('applicants_archive', 'offers_archive');
-- Expected: 2 rows

-- Check storage buckets
SELECT id, name FROM storage.buckets
WHERE id IN ('resumes', 'compliance-documents');
-- Expected: 2 rows
```

---

### 2. Deploy Edge Functions (7 min)

```bash
# Deploy NEW cleanup function
supabase functions deploy cleanup-old-submissions

# Re-deploy UPDATED functions (with file migration)
supabase functions deploy jotform-webhook
supabase functions deploy listApplicants
```

**Verify:**
```bash
supabase functions list
```

**Expected:**
- `cleanup-old-submissions` (deployed)
- `jotform-webhook` (deployed)
- `listApplicants` (deployed)
- `getApplicantDetails` (deployed)

---

### 3. Test File Migration (10 min)

#### Option A: Via Webhook (if JotForm has resume uploads)

1. Submit test application with resume via JotForm
2. Wait 10 seconds
3. Check applicant record:
   ```sql
   SELECT first_name, last_name, resume_url
   FROM applicants
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**Expected:** `resume_url` should be storage path (e.g., `submissionID/file.pdf`), NOT JotForm URL

4. Check logs:
   ```bash
   supabase functions logs jotform-webhook --tail
   ```

**Expected output:**
```
[Webhook] Migrating file for applicant: test@example.com
[FileManager] Downloading: https://files.jotform.com/...
[FileManager] File migrated successfully: submissionID/file.pdf
```

#### Option B: Via List Sync (if no resume uploads)

1. Trigger applicant list sync from UI
2. Check logs:
   ```bash
   supabase functions logs listApplicants --tail
   ```

**Expected:** Should show file migration activity (or skip if no files)

---

### 4. Test Cleanup Function Manually (5 min)

**IMPORTANT:** Only run in test environment first!

```bash
# Trigger cleanup manually
curl -X POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions \
  -H "Authorization: Bearer [YOUR-ANON-KEY]"
```

**Expected response:**
```json
{
  "success": true,
  "archived_applicants": 0,
  "message": "No old applicants to purge"
}
```

**Verify logging:**
```sql
SELECT * FROM ai_logs
WHERE feature = 'data_retention_cleanup'
ORDER BY created_at DESC
LIMIT 1;
```

---

### 5. Schedule Automated Cleanup (5 min)

**See full guide:** [PG_CRON_SETUP_GUIDE.md](PG_CRON_SETUP_GUIDE.md)

**Quick setup:**

```sql
-- Enable pg_cron (via Dashboard → Database → Extensions OR SQL)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM
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

-- Verify scheduled
SELECT jobname, schedule, active FROM cron.job;
```

**Expected:** 1 row with `jobname = 'cleanup-old-applicants'`, `active = true`

---

### 6. Verify Storage Buckets (2 min)

**Via Dashboard:**
1. Go to Supabase Dashboard → **Storage**
2. Verify buckets exist:
   - ✅ `resumes` (private)
   - ✅ `compliance-documents` (private)

**Via SQL:**
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%resume%';
```

**Expected:** 3 policies (upload, view, delete)

---

## Phase 2 Post-Deployment

### Monitor for 24-48 Hours

- [ ] **File migration working:**
  ```sql
  -- Should return 0 (all JotForm URLs migrated)
  SELECT COUNT(*) as pending_jotform_urls
  FROM applicants
  WHERE resume_url LIKE '%jotform%';
  ```

- [ ] **Cleanup job scheduled:**
  ```sql
  SELECT jobname, schedule, active
  FROM cron.job
  WHERE jobname = 'cleanup-old-applicants';
  -- Expected: 1 row with active = true
  ```

- [ ] **Archive tables accessible (admin only):**
  ```sql
  -- Test as admin user
  SELECT COUNT(*) FROM applicants_archive;
  SELECT COUNT(*) FROM offers_archive;
  ```

- [ ] **Storage buckets functional:**
  ```sql
  SELECT bucket_id, COUNT(*) as file_count
  FROM storage.objects
  WHERE bucket_id IN ('resumes', 'compliance-documents')
  GROUP BY bucket_id;
  ```

- [ ] **Cleanup logs successful:**
  ```sql
  SELECT
    created_at,
    success,
    metadata->>'archived_applicants' as archived,
    metadata->>'error' as error
  FROM ai_logs
  WHERE feature = 'data_retention_cleanup'
  ORDER BY created_at DESC
  LIMIT 5;
  ```

---

## Phase 1 Monitoring (Ongoing)

### Monitor for 24 Hours

- [ ] Check webhook delivery rate:
  ```sql
  SELECT
    COUNT(*) as total_webhooks,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
    ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
  FROM ai_logs
  WHERE feature = 'jotform_webhook'
    AND created_at > NOW() - INTERVAL '24 hours';
  ```

- [ ] Verify real-time sync working (submit test application)
- [ ] Check for errors in function logs
- [ ] Confirm API usage reduced (check `ai_logs`)

### Optional: Production Hardening

- [ ] Enable webhook signature verification:
  ```sql
  INSERT INTO settings (key, value, is_encrypted)
  VALUES ('jotform_webhook_secret', 'generated-secret-here', true);
  ```

- [ ] Set up monitoring alerts (Supabase Dashboard → Alerts)
- [ ] Schedule backup polling (`listApplicants` once daily)

---

## Rollback Plans

### Phase 2 Rollback

If issues occur with Phase 2:

1. **Disable pg_cron cleanup:**
   ```sql
   SELECT cron.unschedule('cleanup-old-applicants');
   ```

2. **Restore archived applicant (if needed):**
   ```sql
   -- Replace with actual email
   INSERT INTO applicants
   SELECT id, airtable_id, jotform_id, first_name, last_name, email, phone,
          position_applied, status, resume_url, wp_user_id, created_at, updated_at
   FROM applicants_archive
   WHERE email = 'test@example.com';
   ```

3. **Revert functions to Phase 1:**
   ```bash
   git checkout [phase1-commit] supabase/functions/listApplicants/index.ts
   git checkout [phase1-commit] supabase/functions/jotform-webhook/index.ts
   supabase functions deploy listApplicants
   supabase functions deploy jotform-webhook
   ```

4. **Restore from backup (if critical):**
   ```sql
   DROP TABLE applicants;
   CREATE TABLE applicants AS SELECT * FROM applicants_backup;
   ```

### Phase 1 Rollback

If issues occur with webhooks:

1. **Disable webhooks in JotForm** (Settings → Integrations → Delete webhook)
2. **Revert to pre-webhook functions** (use git to restore previous versions)
3. **Resume manual polling** (refresh dashboard as before)

---

## Success Criteria

### Phase 2 Success
✅ File migration rate ≥ 95%
✅ Archive tables populated with old applicants
✅ pg_cron job scheduled and active
✅ Storage buckets accessible with proper RLS
✅ Cleanup function tested successfully
✅ No pending JotForm URLs in applicants table

### Phase 1 Success (Already Achieved)
✅ Webhooks delivering within 10 seconds
✅ No errors in function logs
✅ Applicants appearing in dashboard automatically
✅ API usage reduced by 80%
✅ Cross-form matching working

---

## Estimated Timeline

### Phase 2 Deployment

| Step | Time | Critical? |
|------|------|-----------|
| Apply migrations | 3 min | ✅ Yes |
| Deploy functions | 7 min | ✅ Yes |
| Test file migration | 10 min | ✅ Yes |
| Test cleanup function | 5 min | ✅ Yes |
| Schedule pg_cron | 5 min | ✅ Yes |
| Verify storage buckets | 2 min | ⚠️ Nice to have |
| **Total** | **32 min** | |

### Phase 1 Deployment (Complete)

| Step | Time | Status |
|------|------|--------|
| Deploy functions | 5 min | ✅ Done |
| Register webhooks | 10 min | ✅ Done |
| Test real-time sync | 5 min | ✅ Done |
| **Total** | **20 min** | ✅ Complete |

---

## Need Help?

### Function Logs

```bash
# Phase 2 functions
supabase functions logs cleanup-old-submissions --tail

# Phase 1 functions
supabase functions logs jotform-webhook --tail
supabase functions logs listApplicants --tail
supabase functions logs getApplicantDetails --tail
```

### Database Logs

```bash
supabase db logs
```

### Manual Testing

**Test cleanup function:**
```bash
curl -X POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions \
  -H "Authorization: Bearer [YOUR-ANON-KEY]"
```

**Test webhook (Phase 1):**
```bash
curl -X POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/jotform-webhook \
  -H "Content-Type: application/json" \
  -d '{"submissionID":"test123","formID":"241904161216448","rawRequest":{"q1_email":"test@example.com"}}'
```

---

## Documentation References

### Phase 2 Documentation
- **Setup Guide:** [PG_CRON_SETUP_GUIDE.md](PG_CRON_SETUP_GUIDE.md) - pg_cron scheduling
- **Verification:** [PHASE_2_VERIFICATION_GUIDE.md](PHASE_2_VERIFICATION_GUIDE.md) - Testing & monitoring
- **Implementation:** [PHASE_2_IMPLEMENTATION_PLAN.md](PHASE_2_IMPLEMENTATION_PLAN.md) - Full technical details
- **Quick Reference:** [PHASE_2_QUICK_REFERENCE.md](PHASE_2_QUICK_REFERENCE.md) - Daily operations

### Phase 1 Documentation (Complete)
- **Summary:** [JOTFORM_INTEGRATION_SUMMARY.md](JOTFORM_INTEGRATION_SUMMARY.md)
- **Webhook Report:** [WEBHOOK_IMPLEMENTATION_REPORT.md](WEBHOOK_IMPLEMENTATION_REPORT.md)
- **Webhook Setup:** [JOTFORM_WEBHOOK_SETUP.md](JOTFORM_WEBHOOK_SETUP.md)

---

## Next Steps

### After Phase 2 is Stable (1 week)

**Monitor these metrics:**
- File migration rate (should be ≥ 95%)
- Cleanup job success rate (should be ≥ 99%)
- Storage usage trends
- Data retention compliance (0 old applicants)

**Future Enhancements (Optional):**
- [ ] Compliance document tracking automation
- [ ] Form schema sync for dynamic UI
- [ ] JotForm Reports API integration
- [ ] Advanced analytics dashboard

---

**Ready to deploy Phase 2?** Follow steps 1-6 above in order.

**Questions?** Check the documentation references above or review function logs.

*Last updated: 2025-12-04*
*Phase 1 Status: ✅ Complete & Verified*
*Phase 2 Status: 🚀 Ready for Deployment*
