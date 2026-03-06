# Phase 2 Quick Reference Card

## 🚀 Deployment Commands

```bash
# Deploy all Phase 2 functions
supabase functions deploy cleanup-old-submissions
supabase functions deploy listApplicants
supabase functions deploy jotform-webhook

# Apply migrations
supabase db push
```

---

## 🔍 Quick Health Checks

### 1. File Migration Status (30 seconds)

```sql
-- Should return 0 (all migrated)
SELECT COUNT(*) as pending_migrations
FROM applicants
WHERE resume_url LIKE '%jotform%';
```

### 2. Cleanup Job Status (30 seconds)

```sql
-- Last cleanup run
SELECT
  created_at,
  success,
  metadata->>'archived_applicants' as archived,
  metadata->>'error' as error
FROM ai_logs
WHERE feature = 'data_retention_cleanup'
ORDER BY created_at DESC
LIMIT 1;
```

### 3. Storage Usage (30 seconds)

```sql
SELECT
  bucket_id,
  COUNT(*) as files,
  ROUND(SUM((metadata->>'size')::numeric)/1024/1024, 2) as size_mb
FROM storage.objects
WHERE bucket_id IN ('resumes', 'compliance-documents')
GROUP BY bucket_id;
```

---

## 🛠️ Common Operations

### Manually Trigger Cleanup

```bash
curl -X POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/cleanup-old-submissions \
  -H "Authorization: Bearer [YOUR-ANON-KEY]"
```

### View Function Logs

```bash
supabase functions logs cleanup-old-submissions --tail
supabase functions logs listApplicants --tail
supabase functions logs jotform-webhook --tail
```

### Check pg_cron Schedule

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'cleanup-old-applicants';
```

---

## 📊 Key Metrics Dashboard

```sql
-- Copy this entire block for weekly dashboard
WITH metrics AS (
  SELECT
    -- File Migration Rate
    ROUND(100.0 * COUNT(CASE WHEN resume_url NOT LIKE '%jotform%' AND resume_url IS NOT NULL THEN 1 END) /
      NULLIF(COUNT(CASE WHEN resume_url IS NOT NULL THEN 1 END), 0), 2) as file_migration_pct,

    -- Total Applicants
    COUNT(*) as total_applicants,

    -- Old Applicants (should be 0)
    COUNT(CASE WHEN created_at < NOW() - INTERVAL '3 months' AND status NOT IN ('Hired', 'Offer') THEN 1 END) as old_applicants
  FROM applicants
),
cleanup_stats AS (
  SELECT
    COUNT(*) as cleanup_runs,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_runs,
    ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as cleanup_success_pct
  FROM ai_logs
  WHERE feature = 'data_retention_cleanup'
    AND created_at > NOW() - INTERVAL '7 days'
),
archive_stats AS (
  SELECT COUNT(*) as total_archived
  FROM applicants_archive
)
SELECT
  m.total_applicants,
  m.file_migration_pct || '%' as file_migration,
  m.old_applicants as retention_violations,
  cs.cleanup_runs as cleanup_runs_7d,
  cs.cleanup_success_pct || '%' as cleanup_success,
  a.total_archived
FROM metrics m
CROSS JOIN cleanup_stats cs
CROSS JOIN archive_stats a;
```

**Expected Results:**
- `file_migration`: ≥ 95%
- `retention_violations`: 0
- `cleanup_success`: ≥ 99%

---

## ⚠️ Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| File migration rate | < 95% | Investigate migration failures |
| Retention violations | > 0 | Check cleanup job schedule |
| Cleanup success rate | < 99% | Review error logs |
| Storage usage | > 80% quota | Consider cleanup or upgrade |
| JotForm URLs remaining | > 10 | Trigger manual sync |

---

## 🔧 Troubleshooting One-Liners

### File Migration Failed

```bash
# Check last 10 migration errors
supabase functions logs jotform-webhook | grep "migration failed" | tail -10
```

### Cleanup Not Running

```sql
-- Check if scheduled
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-applicants';

-- Check last run
SELECT status, return_message, start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-applicants')
ORDER BY start_time DESC
LIMIT 1;
```

### Storage Bucket Issues

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%resume%';
```

---

## 🚨 Emergency Procedures

### Disable Automatic Cleanup

```sql
SELECT cron.unschedule('cleanup-old-applicants');
```

### Restore Archived Applicant

```sql
-- Replace email with actual
INSERT INTO applicants SELECT * FROM applicants_archive WHERE email = 'test@example.com';
```

### Revert to Phase 1 (No File Migration)

```bash
git checkout [previous-commit] supabase/functions/listApplicants/index.ts
git checkout [previous-commit] supabase/functions/jotform-webhook/index.ts
supabase functions deploy listApplicants
supabase functions deploy jotform-webhook
```

---

## 📅 Maintenance Schedule

### Daily (Automated)
- ✅ Data retention cleanup (2 AM via pg_cron)
- ✅ File migration (on-demand via webhooks/sync)

### Weekly (Manual)
- Review key metrics dashboard
- Check function logs for errors
- Verify storage usage trends

### Monthly (Manual)
- Review archive statistics
- Audit data retention compliance
- Check for orphaned files in storage

---

## 📖 Full Documentation

- **Setup:** [PG_CRON_SETUP_GUIDE.md](PG_CRON_SETUP_GUIDE.md)
- **Verification:** [PHASE_2_VERIFICATION_GUIDE.md](PHASE_2_VERIFICATION_GUIDE.md)
- **Implementation:** [PHASE_2_IMPLEMENTATION_PLAN.md](PHASE_2_IMPLEMENTATION_PLAN.md)
- **Phase 1:** [WEBHOOK_IMPLEMENTATION_REPORT.md](WEBHOOK_IMPLEMENTATION_REPORT.md)

---

## 🎯 Success Checklist

- [ ] Archive tables created
- [ ] Storage buckets configured
- [ ] Edge functions deployed
- [ ] File migration working (test submission)
- [ ] pg_cron scheduled
- [ ] Cleanup tested manually
- [ ] Monitoring queries bookmarked
- [ ] Team trained on troubleshooting

**Status:** ✅ Phase 2 Production-Ready

---

**Quick Links:**
- Supabase Dashboard: https://supabase.com/dashboard/project/[YOUR-PROJECT-REF]
- Edge Functions Logs: Dashboard → Edge Functions → Logs
- Storage Browser: Dashboard → Storage → Resumes

**Last Updated:** December 4, 2025
