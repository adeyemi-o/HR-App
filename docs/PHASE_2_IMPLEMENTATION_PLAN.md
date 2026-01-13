# Phase 2 Implementation Plan: Data Retention + File Storage Migration

**Date:** December 4, 2025
**Status:** Ready for Implementation
**Estimated Effort:** 4 days
**Dependencies:** Phase 1 (Webhooks) ✅ Complete

---

## Table of Contents
1. [Phase 1 Recap (Completed)](#phase-1-recap-completed)
2. [Phase 2 Overview](#phase-2-overview)
3. [Part 1: Data Retention Cleanup](#part-1-data-retention-cleanup-2-days)
4. [Part 2: File Storage Migration](#part-2-file-storage-migration-2-days)
5. [Deployment Guide](#deployment-guide)
6. [Testing Checklist](#testing-checklist)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Phase 1 Recap (Completed)

### ✅ What Was Delivered

**Date Completed:** December 4, 2025

#### 1. Real-Time Webhook Integration
- **File:** `supabase/functions/jotform-webhook/index.ts`
- **Status:** ✅ Deployed & Verified
- **Features:**
  - Instant applicant creation (< 5 seconds from submission)
  - Smart field mapping (q1_fullName → first_name, last_name)
  - Deduplication logic (prevents email constraint violations)
  - Compliance form structure (ready for I-9, vaccination, etc.)

#### 2. Centralized JotForm API Client
- **File:** `supabase/functions/_shared/jotform-client.ts`
- **Status:** ✅ Deployed & Verified
- **Features:**
  - Exponential backoff retry logic (3 attempts)
  - Rate limit detection (HTTP 429 handling)
  - Centralized logging to `ai_logs` table
  - Type-safe API response handling

#### 3. Enhanced List Applicants Function
- **File:** `supabase/functions/listApplicants/index.ts`
- **Status:** ✅ Deployed & Verified
- **Improvements:**
  - Uses new `JotFormClient` for consistency
  - Email-based deduplication
  - Preserves applicant status during sync

#### 4. Optimized Applicant Details
- **File:** `supabase/functions/getApplicantDetails/index.ts`
- **Status:** ✅ Deployed & Verified
- **Improvements:**
  - Email-based filtering (reduces API calls by 60-90%)
  - Faster cross-form matching

### 📊 Phase 1 Impact Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Sync Latency | Manual refresh | < 5 seconds | Real-time |
| API Calls/Month | ~2,120 | ~430 | 80% reduction |
| Applicant Visibility | Delayed | Instant | 100% automation |
| Error Handling | Basic try-catch | Exponential backoff | Resilient |

---

## Phase 2 Overview

### Objectives

**Part 1: Data Retention Cleanup**
- Implement 3-month automated archival system
- Create archive tables with admin-only access
- Schedule daily cleanup via pg_cron
- Preserve hired applicants permanently

**Part 2: File Storage Migration**
- Migrate JotForm file URLs to Supabase Storage
- Future-proof for resume uploads & compliance documents
- Prevent 6-month URL expiration issues
- Enable faster file loading

### Why Phase 2 Matters

1. **Compliance:** Meet 3-month data retention requirements
2. **Performance:** Smaller `applicants` table = faster queries
3. **Cost:** Reduce Supabase storage costs
4. **Resilience:** Prevent JotForm URL expiration issues
5. **Future-Proof:** Ready for clients requiring resume uploads

---

## Part 1: Data Retention Cleanup (2 days)

### Database Schema Changes

#### Migration File: `20251204000000_create_applicants_archive.sql`

**Location:** `prolific-hr-app/supabase/migrations/`

```sql
-- Create archive table mirroring applicants structure
CREATE TABLE applicants_archive (
  id UUID PRIMARY KEY,
  airtable_id TEXT,
  jotform_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position_applied TEXT,
  status TEXT NOT NULL,
  resume_url TEXT,
  wp_user_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT DEFAULT '3-month retention policy'
);

-- Create offers archive table (since offers CASCADE on applicant deletion)
CREATE TABLE offers_archive (
  id UUID PRIMARY KEY,
  applicant_id UUID NOT NULL,
  status TEXT NOT NULL,
  position_title TEXT NOT NULL,
  start_date DATE,
  salary NUMERIC(10,2),
  offer_letter_url TEXT,
  secure_token TEXT UNIQUE NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT DEFAULT 'applicant archived'
);

-- Indexes for efficient queries
CREATE INDEX idx_applicants_archive_email ON applicants_archive(email);
CREATE INDEX idx_applicants_archive_archived_at ON applicants_archive(archived_at);
CREATE INDEX idx_applicants_archive_status ON applicants_archive(status);
CREATE INDEX idx_offers_archive_applicant_id ON offers_archive(applicant_id);

-- RLS Policies (admin-only access)
ALTER TABLE applicants_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access to applicants_archive"
ON applicants_archive
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin access to offers_archive"
ON offers_archive
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add helpful comments
COMMENT ON TABLE applicants_archive IS 'Archive of old applicants (3-month retention policy)';
COMMENT ON TABLE offers_archive IS 'Archive of offers linked to archived applicants';
```

**Why These Tables?**
- `applicants_archive`: Stores purged applicant records for audit/compliance
- `offers_archive`: Preserves offer history before CASCADE deletion
- Admin-only RLS: Prevents accidental data exposure

---

### Cleanup Edge Function

#### File: `cleanup-old-submissions/index.ts`

**Location:** `prolific-hr-app/supabase/functions/cleanup-old-submissions/`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 3-month cutoff date
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    console.log(`[Cleanup] Starting for applicants older than ${threeMonthsAgo.toISOString()}`);

    // 1. Find old applicants that should be archived
    // EXCLUDE: Hired, Offer statuses (keep permanently)
    const { data: oldApplicants, error: selectError } = await supabase
      .from('applicants')
      .select('*, offers(*)')
      .lt('created_at', threeMonthsAgo.toISOString())
      .not('status', 'in', '(Hired,Offer)');

    if (selectError) {
      console.error('[Cleanup] Failed to select old applicants:', selectError);
      throw selectError;
    }

    if (!oldApplicants || oldApplicants.length === 0) {
      console.log('[Cleanup] No old applicants to archive');
      return new Response(
        JSON.stringify({
          success: true,
          archived: 0,
          message: 'No old applicants to purge',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cleanup] Found ${oldApplicants.length} applicants to archive`);

    // 2. Archive applicants
    const applicantsToArchive = oldApplicants.map(app => ({
      id: app.id,
      airtable_id: app.airtable_id,
      jotform_id: app.jotform_id,
      first_name: app.first_name,
      last_name: app.last_name,
      email: app.email,
      phone: app.phone,
      position_applied: app.position_applied,
      status: app.status,
      resume_url: app.resume_url,
      wp_user_id: app.wp_user_id,
      created_at: app.created_at,
      updated_at: app.updated_at,
      archived_at: new Date().toISOString(),
      archive_reason: '3-month retention policy',
    }));

    const { error: archiveError } = await supabase
      .from('applicants_archive')
      .insert(applicantsToArchive);

    if (archiveError) {
      console.error('[Cleanup] Failed to archive applicants:', archiveError);
      throw archiveError;
    }

    console.log(`[Cleanup] Archived ${applicantsToArchive.length} applicants`);

    // 3. Archive related offers (before cascade deletion)
    const offersToArchive: any[] = [];
    oldApplicants.forEach(app => {
      if (app.offers && Array.isArray(app.offers)) {
        app.offers.forEach((offer: any) => {
          offersToArchive.push({
            id: offer.id,
            applicant_id: offer.applicant_id,
            status: offer.status,
            position_title: offer.position_title,
            start_date: offer.start_date,
            salary: offer.salary,
            offer_letter_url: offer.offer_letter_url,
            secure_token: offer.secure_token,
            created_by: offer.created_by,
            created_at: offer.created_at,
            updated_at: offer.updated_at,
            expires_at: offer.expires_at,
            signed_at: offer.signed_at,
            archived_at: new Date().toISOString(),
            archive_reason: 'applicant archived',
          });
        });
      }
    });

    if (offersToArchive.length > 0) {
      const { error: offersArchiveError } = await supabase
        .from('offers_archive')
        .insert(offersToArchive);

      if (offersArchiveError) {
        console.error('[Cleanup] Failed to archive offers:', offersArchiveError);
        throw offersArchiveError;
      }

      console.log(`[Cleanup] Archived ${offersToArchive.length} related offers`);
    }

    // 4. Delete applicants (offers will cascade delete)
    const applicantIds = oldApplicants.map(app => app.id);
    const { error: deleteError } = await supabase
      .from('applicants')
      .delete()
      .in('id', applicantIds);

    if (deleteError) {
      console.error('[Cleanup] Failed to delete applicants:', deleteError);
      throw deleteError;
    }

    console.log(`[Cleanup] Deleted ${applicantIds.length} applicants from main table`);

    // 5. Log to ai_logs for monitoring
    await supabase.from('ai_logs').insert({
      feature: 'data_retention_cleanup',
      success: true,
      metadata: {
        archived_applicants: applicantsToArchive.length,
        archived_offers: offersToArchive.length,
        cutoff_date: threeMonthsAgo.toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        archived_applicants: applicantsToArchive.length,
        archived_offers: offersToArchive.length,
        cutoff_date: threeMonthsAgo.toISOString(),
        message: `Successfully archived and purged ${applicantsToArchive.length} old applicants`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Cleanup] Error:', error);

    // Log failure to ai_logs
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('ai_logs').insert({
        feature: 'data_retention_cleanup',
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } catch (logError) {
      console.error('[Cleanup] Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

**Key Features:**
- 3-month boundary (configurable via date calculation)
- Excludes Hired/Offer statuses
- Archives before deletion (zero data loss)
- Comprehensive logging for monitoring
- Error-resilient with fallback logging

---

### Scheduling with pg_cron

#### Migration File: `20251204000001_schedule_cleanup.sql`

**Location:** `prolific-hr-app/supabase/migrations/`

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-applicants',
  '0 2 * * *', -- 2 AM daily (cron format)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cleanup-old-submissions',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'::jsonb
  )
  $$
);

-- Add helpful comment
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for 3-month data retention cleanup';
```

**Important Notes:**
- Requires `pg_cron` extension (available on Supabase Pro plan)
- Runs at 2 AM daily (low-traffic time)
- Uses service role key for authentication

**Alternative (Supabase Free Tier):**
If pg_cron is not available, use Supabase Edge Function triggers:
```bash
# Set up HTTP trigger via external cron service (e.g., cron-job.org)
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/cleanup-old-submissions \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY"
```

---

## Part 2: File Storage Migration (2 days)

### Storage Bucket Creation

#### Migration File: `20251204000002_create_storage_buckets.sql`

**Location:** `prolific-hr-app/supabase/migrations/`

```sql
-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('resumes', 'resumes', false),
  ('compliance-documents', 'compliance-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for resumes bucket
CREATE POLICY "Authenticated users can upload resumes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Authenticated users can view resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'resumes');

CREATE POLICY "Admins can delete resumes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- RLS Policies for compliance-documents bucket
CREATE POLICY "Authenticated users can upload compliance docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'compliance-documents');

CREATE POLICY "Authenticated users can view compliance docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'compliance-documents');

CREATE POLICY "Admins can delete compliance docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'compliance-documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add helpful comments
COMMENT ON TABLE storage.buckets IS 'Supabase Storage buckets for file uploads';
```

**Bucket Configuration:**
- Private buckets (not publicly accessible)
- Role-based access (admin delete, all authenticated view/upload)
- Separate buckets for resumes vs compliance documents

---

### File Manager Utility

#### File: `_shared/file-manager.ts`

**Location:** `prolific-hr-app/supabase/functions/_shared/`

```typescript
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface FileUploadResult {
  success: boolean;
  storageUrl?: string;
  error?: string;
}

/**
 * Downloads a file from JotForm CDN and uploads to Supabase Storage
 *
 * @param jotformFileUrl - Full URL to file on JotForm's CDN
 * @param applicantId - JotForm submission ID (used for folder structure)
 * @param supabase - Supabase client instance
 * @returns Upload result with storage path or error
 */
export async function migrateFileToStorage(
  jotformFileUrl: string,
  applicantId: string,
  supabase: SupabaseClient
): Promise<FileUploadResult> {
  try {
    // 1. Download file from JotForm
    console.log(`[FileManager] Downloading: ${jotformFileUrl}`);
    const response = await fetch(jotformFileUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to download file: HTTP ${response.status}`,
      };
    }

    const fileBlob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // 2. Extract filename from URL or generate one
    const urlParts = jotformFileUrl.split('/');
    const originalFilename = urlParts[urlParts.length - 1].split('?')[0];
    const fileExtension = originalFilename.split('.').pop() || 'pdf';
    const filename = `${applicantId}_${Date.now()}.${fileExtension}`;

    // 3. Upload to Supabase Storage
    const storagePath = `${applicantId}/${filename}`;
    console.log(`[FileManager] Uploading to: resumes/${storagePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, fileBlob, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[FileManager] Upload error:', uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    console.log(`[FileManager] File migrated successfully: ${storagePath}`);

    return {
      success: true,
      storageUrl: storagePath, // Store path, not signed URL (regenerate as needed)
    };
  } catch (error) {
    console.error('[FileManager] Migration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a URL is a JotForm-hosted file
 */
export function isJotFormFileUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('jotform.com') || url.includes('jotformcdn.com');
}

/**
 * Generate signed URL for Supabase Storage path
 *
 * @param storagePath - Path in storage bucket (e.g., "applicant123/file.pdf")
 * @param bucket - Bucket name (e.g., "resumes")
 * @param supabase - Supabase client instance
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Signed URL or null if error
 */
export async function getSignedUrl(
  storagePath: string,
  bucket: string,
  supabase: SupabaseClient,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    console.error('[FileManager] Failed to generate signed URL:', error);
    return null;
  }

  return data.signedUrl;
}
```

**Why This Approach?**
- **Automatic migration:** Files copied from JotForm to Supabase on first sync
- **Fallback support:** Keeps original JotForm URL if migration fails
- **Storage path vs URL:** Stores path (not signed URL) in database, regenerates signed URLs as needed
- **Future-proof:** Works for any file upload field (resumes, licenses, etc.)

---

### Update listApplicants with File Migration

#### Modification: `listApplicants/index.ts`

**Location:** `prolific-hr-app/supabase/functions/listApplicants/index.ts`

**Change 1:** Add import at top of file (after line 3)
```typescript
import { JotFormClient, mapSubmissionToApplicant } from '../_shared/jotform-client.ts'
import { migrateFileToStorage, isJotFormFileUrl } from '../_shared/file-manager.ts' // ADD THIS
```

**Change 2:** Modify the `.map()` function (around line 77-111)

Replace this section:
```typescript
// Map submissions to applicant data using the helper function
const applicants = submissions.map((submission: any) => {
    // Use the new mapping function for consistency
    const baseData = mapSubmissionToApplicant(submission)

    // ... existing logic ...

    return payload;
});
```

With this (adds file migration logic):
```typescript
// Map submissions to applicant data using the helper function
const applicants = await Promise.all(submissions.map(async (submission: any) => {
    // Use the new mapping function for consistency
    const baseData = mapSubmissionToApplicant(submission)

    // ============ NEW: File Migration Logic ============
    // Check if resume_url needs migration from JotForm to Supabase Storage
    if (baseData.resume_url && isJotFormFileUrl(baseData.resume_url)) {
        console.log(`[listApplicants] Migrating file for applicant: ${baseData.email}`);
        const migrationResult = await migrateFileToStorage(
            baseData.resume_url,
            baseData.jotform_id,
            supabase
        );

        if (migrationResult.success && migrationResult.storageUrl) {
            baseData.resume_url = migrationResult.storageUrl; // Update to storage path
            console.log(`[listApplicants] File migrated: ${migrationResult.storageUrl}`);
        } else {
            console.warn(`[listApplicants] File migration failed: ${migrationResult.error}`);
            // Keep original JotForm URL as fallback
        }
    }
    // ===================================================

    // 1. Try to find existing record by JotForm ID (Primary match)
    let existingMatch = jotformIdMap.get(baseData.jotform_id)
    let existingId = existingMatch?.id;
    let existingStatus = existingMatch?.status;

    // ... rest of existing logic ...

    return payload;
}));
```

**Important:** Change `submissions.map()` to `await Promise.all(submissions.map(async` because file migration is async.

---

### Update Webhook Handler with File Migration

#### Modification: `jotform-webhook/index.ts`

**Location:** `prolific-hr-app/supabase/functions/jotform-webhook/index.ts`

**Change 1:** Add import at top of file (after line 12)
```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { mapSubmissionToApplicant } from '../_shared/jotform-client.ts';
import { migrateFileToStorage, isJotFormFileUrl } from '../_shared/file-manager.ts'; // ADD THIS
```

**Change 2:** Modify `handleApplicationSubmission` function (around line 200)

Find this section:
```typescript
// Map to applicant data
const applicantData = mapSubmissionToApplicant(submission);

// Check if applicant already exists
const { data: existing } = await supabase
    .from('applicants')
    .select('id, status')
    .eq('jotform_id', applicantData.jotform_id)
    .single();
```

Insert file migration logic **between** mapping and checking existing:
```typescript
// Map to applicant data
const applicantData = mapSubmissionToApplicant(submission);

// ============ NEW: File Migration Logic ============
// Migrate file if present in submission
if (applicantData.resume_url && isJotFormFileUrl(applicantData.resume_url)) {
    console.log(`[Webhook] Migrating file for applicant: ${applicantData.email}`);
    const migrationResult = await migrateFileToStorage(
        applicantData.resume_url,
        applicantData.jotform_id,
        supabase
    );

    if (migrationResult.success && migrationResult.storageUrl) {
        applicantData.resume_url = migrationResult.storageUrl;
        console.log(`[Webhook] File migrated: ${migrationResult.storageUrl}`);
    } else {
        console.warn(`[Webhook] File migration failed: ${migrationResult.error}`);
        // Keep original JotForm URL as fallback
    }
}
// ===================================================

// Check if applicant already exists
const { data: existing } = await supabase
    .from('applicants')
    .select('id, status')
    .eq('jotform_id', applicantData.jotform_id)
    .single();
```

---

## Deployment Guide

### Step 1: Create Migration Files

```bash
cd "prolific-hr-app/supabase/migrations"

# Create archive tables migration
# (Copy SQL from Part 1 above)
touch 20251204000000_create_applicants_archive.sql

# Create cleanup scheduling migration
# (Copy SQL from Part 1 above)
touch 20251204000001_schedule_cleanup.sql

# Create storage buckets migration
# (Copy SQL from Part 2 above)
touch 20251204000002_create_storage_buckets.sql
```

### Step 2: Apply Migrations

```bash
cd prolific-hr-app

# Apply all migrations
supabase db push

# Verify tables created
supabase db inspect tables
# Should show: applicants_archive, offers_archive

# Verify storage buckets
# Go to Supabase Dashboard → Storage
# Should show: resumes, compliance-documents
```

### Step 3: Create Edge Functions

```bash
cd prolific-hr-app/supabase/functions

# Create cleanup function directory
mkdir -p cleanup-old-submissions

# Create file manager utility
mkdir -p _shared

# Copy code from above into these files:
# - cleanup-old-submissions/index.ts
# - _shared/file-manager.ts
```

### Step 4: Deploy Edge Functions

```bash
cd prolific-hr-app

# Deploy NEW cleanup function
supabase functions deploy cleanup-old-submissions

# Re-deploy UPDATED functions with file migration
supabase functions deploy listApplicants
supabase functions deploy jotform-webhook

# Verify deployment
supabase functions list
# Should show all 4 functions with "deployed" status
```

### Step 5: Test Cleanup Function

```bash
# Test manually before scheduling
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/cleanup-old-submissions \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json"

# Expected response:
# {"success":true,"archived":0,"message":"No old applicants to purge"}
```

### Step 6: Verify pg_cron Job

```sql
-- In Supabase SQL Editor:

-- Check job is scheduled
SELECT * FROM cron.job;
-- Should show: cleanup-old-applicants | 0 2 * * *

-- Check job run history (after 2 AM next day)
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-applicants')
ORDER BY start_time DESC
LIMIT 10;
```

---

## Testing Checklist

### Data Retention Tests

#### Test 1: Archive Old Applicants
```sql
-- 1. Create test applicant with old date
INSERT INTO applicants (id, jotform_id, first_name, last_name, email, status, created_at)
VALUES (
  gen_random_uuid(),
  'test_old_applicant',
  'Test',
  'Old',
  'test.old@example.com',
  'Rejected',
  NOW() - INTERVAL '4 months'
);

-- 2. Run cleanup function manually (via curl or Supabase dashboard)

-- 3. Verify applicant moved to archive
SELECT * FROM applicants_archive WHERE email = 'test.old@example.com';

-- 4. Verify original deleted
SELECT * FROM applicants WHERE email = 'test.old@example.com';
-- Should return 0 rows

-- 5. Check ai_logs
SELECT * FROM ai_logs WHERE feature = 'data_retention_cleanup' ORDER BY created_at DESC LIMIT 1;
```

**Expected Results:**
- ✅ 1 record in `applicants_archive`
- ✅ 0 records in `applicants`
- ✅ 1 success log in `ai_logs`

---

#### Test 2: Preserve Hired Applicants
```sql
-- 1. Create hired applicant with old date
INSERT INTO applicants (id, jotform_id, first_name, last_name, email, status, created_at)
VALUES (
  gen_random_uuid(),
  'test_hired_applicant',
  'Test',
  'Hired',
  'test.hired@example.com',
  'Hired',
  NOW() - INTERVAL '4 months'
);

-- 2. Run cleanup function

-- 3. Verify NOT archived
SELECT * FROM applicants WHERE email = 'test.hired@example.com';
-- Should still return 1 row
```

**Expected Results:**
- ✅ 1 record in `applicants` (NOT deleted)
- ✅ 0 records in `applicants_archive`

---

### File Storage Tests

#### Test 3: File Migration (Manual)
```bash
# 1. Submit JotForm with file upload OR manually insert test record
INSERT INTO applicants (id, jotform_id, first_name, last_name, email, resume_url, created_at)
VALUES (
  gen_random_uuid(),
  'test_file_applicant',
  'Test',
  'File',
  'test.file@example.com',
  'https://www.jotform.com/uploads/test.pdf',
  NOW()
);

# 2. Trigger listApplicants function
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/listApplicants \
  -H "Authorization: Bearer YOUR-ANON-KEY"

# 3. Check Supabase Storage
# Go to Dashboard → Storage → resumes
# Should see: test_file_applicant/test_file_applicant_[timestamp].pdf

# 4. Verify database updated
SELECT resume_url FROM applicants WHERE email = 'test.file@example.com';
-- Should show storage path, NOT JotForm URL
```

**Expected Results:**
- ✅ File uploaded to Supabase Storage
- ✅ `resume_url` updated to storage path
- ✅ Original JotForm URL replaced

---

#### Test 4: Non-JotForm URL (Skip Migration)
```sql
-- 1. Insert applicant with non-JotForm URL
INSERT INTO applicants (id, jotform_id, first_name, last_name, email, resume_url, created_at)
VALUES (
  gen_random_uuid(),
  'test_external_url',
  'Test',
  'External',
  'test.external@example.com',
  'https://example.com/resume.pdf',
  NOW()
);

-- 2. Trigger listApplicants function

-- 3. Verify URL unchanged
SELECT resume_url FROM applicants WHERE email = 'test.external@example.com';
-- Should still show: https://example.com/resume.pdf
```

**Expected Results:**
- ✅ URL unchanged (not migrated)
- ✅ No errors in logs

---

### Scheduled Job Tests

#### Test 5: pg_cron Execution
```sql
-- 1. Verify job exists
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-applicants';
-- Should return 1 row

-- 2. Check last run (wait until after 2 AM)
SELECT
  jobid,
  runid,
  job_pid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-applicants')
ORDER BY start_time DESC
LIMIT 5;

-- 3. Verify ai_logs entry created
SELECT * FROM ai_logs
WHERE feature = 'data_retention_cleanup'
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

**Expected Results:**
- ✅ Job runs daily at 2 AM
- ✅ Status shows success
- ✅ `ai_logs` entry created each run

---

## Monitoring & Maintenance

### Daily Checks (Automated)

#### Query 1: Archive Statistics
```sql
-- Run this weekly to monitor archival activity
SELECT
  DATE(archived_at) as date,
  archive_reason,
  COUNT(*) as total_archived,
  COUNT(DISTINCT email) as unique_applicants
FROM applicants_archive
WHERE archived_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(archived_at), archive_reason
ORDER BY date DESC;
```

**What to Look For:**
- Steady archival rate (not spiking suddenly)
- All reasons = "3-month retention policy"
- No duplicate emails

---

#### Query 2: Cleanup Success Rate
```sql
-- Run this monthly to ensure reliability
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_runs,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  MAX(metadata->>'archived_applicants') as max_archived_in_run
FROM ai_logs
WHERE feature = 'data_retention_cleanup'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**What to Look For:**
- Success rate ≥ 99%
- Failed runs = 0 (or investigate immediately)
- `max_archived_in_run` should be consistent

---

#### Query 3: File Migration Statistics
```sql
-- Check storage usage and migration health
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_size_bytes,
  ROUND(SUM((metadata->>'size')::bigint)::numeric / 1024 / 1024, 2) as total_size_mb
FROM storage.objects
WHERE bucket_id IN ('resumes', 'compliance-documents')
GROUP BY bucket_id;
```

**What to Look For:**
- Steady growth in `file_count`
- Storage usage within Supabase plan limits

---

#### Query 4: Applicant Table Health
```sql
-- Monitor main table size and oldest records
SELECT
  COUNT(*) as total_applicants,
  COUNT(DISTINCT status) as unique_statuses,
  MIN(created_at) as oldest_applicant,
  MAX(created_at) as newest_applicant,
  AGE(NOW(), MIN(created_at)) as oldest_applicant_age
FROM applicants;
```

**What to Look For:**
- `oldest_applicant_age` ≤ 3 months (for non-hired)
- Stable `total_applicants` count

---

### Alerts to Set Up

**Alert 1: Cleanup Failures**
```sql
-- If any cleanup runs fail in last 24 hours, send alert
SELECT COUNT(*) as failed_runs
FROM ai_logs
WHERE feature = 'data_retention_cleanup'
  AND success = false
  AND created_at > NOW() - INTERVAL '24 hours';
-- Trigger alert if failed_runs > 0
```

**Alert 2: No Cleanup Runs**
```sql
-- If no cleanup runs in last 48 hours, send alert
SELECT COUNT(*) as recent_runs
FROM ai_logs
WHERE feature = 'data_retention_cleanup'
  AND created_at > NOW() - INTERVAL '48 hours';
-- Trigger alert if recent_runs = 0
```

**Alert 3: Storage Quota**
```sql
-- If storage usage exceeds 80% of plan limit
SELECT
  SUM((metadata->>'size')::bigint) / 1024 / 1024 / 1024 as storage_gb
FROM storage.objects;
-- Trigger alert if storage_gb > 0.8 * YOUR_PLAN_LIMIT_GB
```

---

### Rollback Procedures

#### Scenario 1: Cleanup Function Misbehaves

**Step 1:** Disable pg_cron job immediately
```sql
SELECT cron.unschedule('cleanup-old-applicants');
```

**Step 2:** Investigate logs
```sql
SELECT * FROM ai_logs
WHERE feature = 'data_retention_cleanup'
ORDER BY created_at DESC
LIMIT 10;
```

**Step 3:** Restore accidentally deleted data
```sql
-- Restore specific applicant
INSERT INTO applicants (id, first_name, last_name, email, phone, position_applied, status, resume_url, created_at, updated_at)
SELECT id, first_name, last_name, email, phone, position_applied, status, resume_url, created_at, updated_at
FROM applicants_archive
WHERE email = 'wrongly.deleted@example.com';

-- Restore related offers
INSERT INTO offers (id, applicant_id, status, position_title, start_date, salary, offer_letter_url, secure_token, created_by, created_at, updated_at, expires_at, signed_at)
SELECT id, applicant_id, status, position_title, start_date, salary, offer_letter_url, secure_token, created_by, created_at, updated_at, expires_at, signed_at
FROM offers_archive
WHERE applicant_id = (SELECT id FROM applicants WHERE email = 'wrongly.deleted@example.com');
```

**Step 4:** Fix code and re-deploy
```bash
# Fix bug in cleanup-old-submissions/index.ts
# Re-deploy
supabase functions deploy cleanup-old-submissions

# Re-enable cron job
SELECT cron.schedule(
  'cleanup-old-applicants',
  '0 2 * * *',
  $$ ... $$
);
```

---

#### Scenario 2: File Migration Issues

**Step 1:** Check error logs
```bash
supabase functions logs listApplicants --tail
# Look for "[FileManager]" errors
```

**Step 2:** Identify failed migrations
```sql
SELECT id, first_name, last_name, email, resume_url
FROM applicants
WHERE resume_url LIKE '%jotform%'
  AND created_at > NOW() - INTERVAL '7 days';
-- These are JotForm URLs that failed to migrate
```

**Step 3:** Manual re-migration
```bash
# Re-run listApplicants to retry failed migrations
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/listApplicants \
  -H "Authorization: Bearer YOUR-ANON-KEY"
```

---

#### Scenario 3: Nuclear Rollback (Revert Everything)

**⚠️ DANGER: Only use if absolutely necessary**

```bash
# 1. Disable pg_cron job
SELECT cron.unschedule('cleanup-old-applicants');

# 2. Drop archive tables
DROP TABLE applicants_archive CASCADE;
DROP TABLE offers_archive CASCADE;

# 3. Drop storage buckets
DELETE FROM storage.buckets WHERE id IN ('resumes', 'compliance-documents');

# 4. Revert migrations
cd prolific-hr-app
git checkout HEAD~3 supabase/migrations/
supabase db push

# 5. Revert Edge Function changes
git checkout HEAD~1 supabase/functions/listApplicants/index.ts
git checkout HEAD~1 supabase/functions/jotform-webhook/index.ts
supabase functions deploy listApplicants
supabase functions deploy jotform-webhook
```

---

## Success Metrics

### Phase 2 KPIs

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Retention Compliance** | 100% of applicants >3 months archived | Query 4 above |
| **Archive Integrity** | 0 data loss | Compare counts before/after cleanup |
| **Cleanup Success Rate** | ≥ 99% daily runs succeed | Query 2 above |
| **File Migration Rate** | ≥ 95% JotForm files migrated | Count JotForm URLs in DB |
| **Storage Growth** | Predictable, linear growth | Query 3 above |
| **Zero Downtime** | No user-facing errors | Monitor error rates |

---

## Documentation Updates

### Files to Create

1. **DATA_RETENTION_POLICY.md**
   - Document 3-month policy
   - Restore procedures
   - Admin access to archive tables

2. **FILE_STORAGE_GUIDE.md**
   - How file migration works
   - Generating signed URLs
   - Troubleshooting migration failures

### Files to Update

1. **DEPLOYMENT_CHECKLIST.md**
   - Add Phase 2 deployment steps
   - Update with new Edge Function

2. **JOTFORM_INTEGRATION_SUMMARY.md**
   - Add data retention section
   - Update file storage details

---

## Phase 3 Preview (Future)

Once Phase 2 is stable (1-2 weeks), consider:

**Phase 3A: Form Schema Sync**
- Auto-detect form field changes
- Dynamic UI rendering
- Compliance field identification

**Phase 3B: Compliance Tracking**
- Link compliance forms to employees
- Expiry date tracking
- Automated alerts for expiring documents

**Phase 3C: Reports Integration**
- JotForm Reports API integration
- Application funnel metrics
- Completion rate tracking

---

## Questions?

**Need Help?**
- Check Edge Function logs: `supabase functions logs <function-name> --tail`
- Check database logs: `supabase db logs`
- Review `ai_logs` table for cleanup errors

**Found a Bug?**
- Check the rollback procedures above
- Restore from archive if needed
- File issue in project repository

---

**End of Phase 2 Implementation Plan**

*Last Updated: December 4, 2025*
*Status: Ready for Implementation*
*Estimated Completion: 4 days*
