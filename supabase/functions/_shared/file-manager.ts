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
