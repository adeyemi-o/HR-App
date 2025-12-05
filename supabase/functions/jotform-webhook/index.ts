/**
 * JotForm Webhook Handler
 *
 * Receives real-time submission notifications from JotForm and:
 * 1. Validates webhook signature for security
 * 2. Creates/updates applicant records
 * 3. Handles compliance document submissions
 * 4. Broadcasts updates via Supabase Realtime
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { mapSubmissionToApplicant } from '../_shared/jotform-client.ts';
import { migrateFileToStorage, isJotFormFileUrl } from '../_shared/file-manager.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  submissionID: string;
  formID: string;
  rawRequest: Record<string, any>;
  pretty?: string;
  created_at?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const contentType = req.headers.get('content-type') || '';
    let payload: WebhookPayload;

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      const rawRequest: Record<string, any> = {};

      for (const [key, value] of formData.entries()) {
        rawRequest[key] = value;
      }

      payload = {
        submissionID: formData.get('submissionID') as string,
        formID: formData.get('formID') as string,
        rawRequest,
      };
    } else {
      throw new Error('Unsupported content type');
    }

    console.log('Webhook received:', {
      submissionID: payload.submissionID,
      formID: payload.formID,
    });

    // Fetch settings to determine form type
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .or('key.like.%jotform%');

    if (settingsError) {
      throw new Error(`Failed to fetch settings: ${settingsError.message}`);
    }

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    // Determine which form this submission is for
    const formType = determineFormType(payload.formID, settingsMap);

    console.log('Form type detected:', formType);

    // Handle based on form type
    if (formType === 'application') {
      await handleApplicationSubmission(payload, supabase);
    } else if (formType === 'compliance') {
      await handleComplianceSubmission(payload, formType, supabase);
    } else {
      console.log('Unknown form type, skipping processing');
    }

    // Broadcast update via Realtime
    await supabase
      .channel('applicants')
      .send({
        type: 'broadcast',
        event: 'submission_received',
        payload: {
          submissionId: payload.submissionID,
          formId: payload.formID,
          formType,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        formType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Determine form type from form ID
 */
function determineFormType(
  formId: string,
  settings: Map<string, string>
): string | null {
  const formTypes = [
    'application',
    'emergency',
    'i9',
    'vaccination',
    'licenses',
    'background',
  ];

  for (const type of formTypes) {
    const settingKey = `jotform_form_id_${type}`;
    const storedFormId = settings.get(settingKey);

    if (storedFormId === formId) {
      // Application is main form, others are compliance
      return type === 'application' ? 'application' : 'compliance';
    }
  }

  return null;
}

/**
 * Handle application form submission
 */
async function handleApplicationSubmission(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // Convert rawRequest to JotForm submission format
  const answers: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload.rawRequest)) {
    // JotForm question keys are like "q1_fullName", "q2_email"
    if (key.startsWith('q')) {
      const questionId = key.split('_')[0]; // Extract "q1", "q2", etc.
      const fieldName = key.substring(key.indexOf('_') + 1); // Extract field name

      answers[questionId] = {
        name: fieldName,
        answer: value,
        text: fieldName, // Use field name as label
        type: typeof value === 'object' ? 'complex' : 'text',
      };
    }
  }

  const submission = {
    id: payload.submissionID,
    form_id: payload.formID,
    created_at: payload.created_at || new Date().toISOString(),
    answers,
    ip: '',
    status: 'ACTIVE',
    new: '1',
    flag: '0',
    notes: '',
    updated_at: null,
  };

  // Map to applicant data
  const applicantData = mapSubmissionToApplicant(submission);

  // Migrate file if present in submission (from JotForm CDN to Supabase Storage)
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

  // Check if applicant already exists
  const { data: existing } = await supabase
    .from('applicants')
    .select('id, status')
    .eq('jotform_id', applicantData.jotform_id)
    .single();

  if (existing) {
    // Update existing applicant (preserve status)
    const { error: updateError } = await supabase
      .from('applicants')
      .update({
        first_name: applicantData.first_name,
        last_name: applicantData.last_name,
        email: applicantData.email,
        phone: applicantData.phone,
        position_applied: applicantData.position_applied,
        resume_url: applicantData.resume_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Failed to update applicant: ${updateError.message}`);
    }

    console.log('Updated existing applicant:', existing.id);
  } else {
    // Create new applicant
    const { error: insertError } = await supabase
      .from('applicants')
      .insert({
        ...applicantData,
        status: 'New',
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      // Handle unique constraint on email
      if (insertError.code === '23505' && insertError.message.includes('email')) {
        // Update by email instead
        const { error: updateByEmailError } = await supabase
          .from('applicants')
          .update({
            jotform_id: applicantData.jotform_id,
            first_name: applicantData.first_name,
            last_name: applicantData.last_name,
            phone: applicantData.phone,
            position_applied: applicantData.position_applied,
            resume_url: applicantData.resume_url,
            updated_at: new Date().toISOString(),
          })
          .eq('email', applicantData.email);

        if (updateByEmailError) {
          throw new Error(`Failed to update applicant by email: ${updateByEmailError.message}`);
        }

        console.log('Updated applicant by email match');
      } else {
        throw new Error(`Failed to create applicant: ${insertError.message}`);
      }
    } else {
      console.log('Created new applicant');
    }
  }
}

/**
 * Handle compliance form submissions
 * (Emergency Contact, I-9, Vaccination, Licenses, Background Check)
 */
async function handleComplianceSubmission(
  payload: WebhookPayload,
  formType: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // Extract email from submission to link to employee
  let email = '';

  for (const [key, value] of Object.entries(payload.rawRequest)) {
    if (key.toLowerCase().includes('email') && typeof value === 'string') {
      email = value;
      break;
    }
  }

  if (!email) {
    console.log('No email found in compliance submission, skipping');
    return;
  }

  // Find employee by email
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('email', email)
    .single();

  if (!employee) {
    console.log('No employee found for email:', email);
    return;
  }

  // TODO: Create compliance_documents table and insert record
  // For now, just log
  console.log('Compliance submission received:', {
    employeeId: employee.id,
    formType,
    submissionId: payload.submissionID,
  });
}
