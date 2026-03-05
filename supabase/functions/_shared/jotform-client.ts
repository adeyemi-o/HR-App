/**
 * Centralized JotForm API Client
 *
 * Features:
 * - Exponential backoff retry logic
 * - Rate limit detection and handling
 * - Error logging to ai_logs table
 * - Type-safe API responses
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const JOTFORM_API_BASE = 'https://api.jotform.com';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

interface JotFormConfig {
  apiKey: string;
  formIds: {
    application?: string;
    emergency?: string;
    i9?: string;
    vaccination?: string;
    licenses?: string;
    background?: string;
  };
}

interface JotFormSubmission {
  id: string;
  form_id: string;
  ip: string;
  created_at: string;
  status: string;
  new: string;
  flag: string;
  notes: string;
  updated_at: string | null;
  answers: Record<string, any>;
}

interface JotFormApiResponse<T> {
  responseCode: number;
  message: string;
  content: T;
  duration: string;
  'limit-left'?: number;
}

interface RetryConfig {
  attempt: number;
  maxRetries: number;
  delay: number;
}

export class JotFormClient {
  private apiKey: string;
  private supabase: ReturnType<typeof createClient>;
  private userId?: string;

  constructor(apiKey: string, supabaseUrl: string, supabaseKey: string, userId?: string) {
    this.apiKey = apiKey;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.userId = userId;
  }

  /**
   * Fetch all submissions for a form with optional filtering
   */
  async getFormSubmissions(
    formId: string,
    options: {
      limit?: number;
      offset?: number;
      filter?: Record<string, any>;
      orderby?: string;
    } = {}
  ): Promise<JotFormSubmission[]> {
    const { limit = 100, offset = 0, filter, orderby = 'created_at' } = options;

    let endpoint = `/form/${formId}/submissions?apiKey=${this.apiKey}&limit=${limit}&offset=${offset}&orderby=${orderby}`;

    // Add filter if provided
    if (filter) {
      const filterStr = JSON.stringify(filter);
      endpoint += `&filter=${encodeURIComponent(filterStr)}`;
    }

    const response = await this.fetchWithRetry<JotFormSubmission[]>(endpoint);
    return response.content;
  }

  /**
   * Get a single submission by ID
   */
  async getSubmission(submissionId: string): Promise<JotFormSubmission> {
    const endpoint = `/submission/${submissionId}?apiKey=${this.apiKey}`;
    const response = await this.fetchWithRetry<JotFormSubmission>(endpoint);
    return response.content;
  }

  /**
   * Get form questions/schema
   */
  async getFormQuestions(formId: string): Promise<any> {
    const endpoint = `/form/${formId}/questions?apiKey=${this.apiKey}`;
    const response = await this.fetchWithRetry<any>(endpoint);
    return response.content;
  }

  /**
   * Get form properties
   */
  async getFormProperties(formId: string): Promise<any> {
    const endpoint = `/form/${formId}/properties?apiKey=${this.apiKey}`;
    const response = await this.fetchWithRetry<any>(endpoint);
    return response.content;
  }

  /**
   * Register a webhook for a form
   */
  async createWebhook(formId: string, webhookUrl: string): Promise<any> {
    const endpoint = `/form/${formId}/webhooks?apiKey=${this.apiKey}`;
    const response = await this.fetchWithRetry<any>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        webhookURL: webhookUrl,
      }).toString(),
    });
    return response.content;
  }

  /**
   * List all webhooks for a form
   */
  async listWebhooks(formId: string): Promise<any> {
    const endpoint = `/form/${formId}/webhooks?apiKey=${this.apiKey}`;
    const response = await this.fetchWithRetry<any>(endpoint);
    return response.content;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(formId: string, webhookId: string): Promise<any> {
    const endpoint = `/form/${formId}/webhooks/${webhookId}?apiKey=${this.apiKey}`;
    const response = await this.fetchWithRetry<any>(endpoint, {
      method: 'DELETE',
    });
    return response.content;
  }

  /**
   * Core fetch method with retry logic and error handling
   */
  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retryConfig: RetryConfig = {
      attempt: 0,
      maxRetries: MAX_RETRIES,
      delay: INITIAL_RETRY_DELAY,
    }
  ): Promise<JotFormApiResponse<T>> {
    const url = `${JOTFORM_API_BASE}${endpoint}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'APIKEY': this.apiKey,
          ...options.headers,
        },
      });

      const duration = Date.now() - startTime;
      const data = await response.json() as JotFormApiResponse<T>;

      // Check for rate limiting
      if (response.status === 429) {
        await this.logApiCall({
          endpoint,
          success: false,
          statusCode: 429,
          duration,
          error: 'Rate limit exceeded',
        });

        if (retryConfig.attempt < retryConfig.maxRetries) {
          console.log(`Rate limited. Retrying in ${retryConfig.delay}ms (attempt ${retryConfig.attempt + 1}/${retryConfig.maxRetries})`);
          await this.sleep(retryConfig.delay);
          return this.fetchWithRetry<T>(endpoint, options, {
            attempt: retryConfig.attempt + 1,
            maxRetries: retryConfig.maxRetries,
            delay: retryConfig.delay * 2, // Exponential backoff
          });
        }

        throw new Error('Rate limit exceeded. Max retries reached.');
      }

      // Check for other errors
      if (!response.ok || data.responseCode !== 200) {
        const errorMsg = data.message || `HTTP ${response.status}`;
        await this.logApiCall({
          endpoint,
          success: false,
          statusCode: response.status,
          duration,
          error: errorMsg,
        });

        // Retry on server errors (5xx)
        if (response.status >= 500 && retryConfig.attempt < retryConfig.maxRetries) {
          console.log(`Server error. Retrying in ${retryConfig.delay}ms (attempt ${retryConfig.attempt + 1}/${retryConfig.maxRetries})`);
          await this.sleep(retryConfig.delay);
          return this.fetchWithRetry<T>(endpoint, options, {
            attempt: retryConfig.attempt + 1,
            maxRetries: retryConfig.maxRetries,
            delay: retryConfig.delay * 2,
          });
        }

        throw new Error(`JotForm API Error: ${errorMsg}`);
      }

      // Success - log it
      await this.logApiCall({
        endpoint,
        success: true,
        statusCode: response.status,
        duration,
        rateLimitRemaining: data['limit-left'],
      });

      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      await this.logApiCall({
        endpoint,
        success: false,
        statusCode: 0,
        duration,
        error: errorMsg,
      });

      // Retry on network errors
      if (retryConfig.attempt < retryConfig.maxRetries && this.isRetryableError(error)) {
        console.log(`Network error. Retrying in ${retryConfig.delay}ms (attempt ${retryConfig.attempt + 1}/${retryConfig.maxRetries})`);
        await this.sleep(retryConfig.delay);
        return this.fetchWithRetry<T>(endpoint, options, {
          attempt: retryConfig.attempt + 1,
          maxRetries: retryConfig.maxRetries,
          delay: retryConfig.delay * 2,
        });
      }

      throw error;
    }
  }

  /**
   * Log API call to ai_logs table for monitoring
   */
  private async logApiCall(log: {
    endpoint: string;
    success: boolean;
    statusCode: number;
    duration: number;
    error?: string;
    rateLimitRemaining?: number;
  }): Promise<void> {
    try {
      await this.supabase.from('ai_logs').insert({
        user_id: this.userId,
        feature: 'jotform_api',
        model: 'jotform',
        input: log.endpoint,
        output: log.success ? 'success' : log.error,
        tokens_in: 0,
        tokens_out: 0,
        success: log.success,
        error: log.error,
        metadata: {
          statusCode: log.statusCode,
          duration: log.duration,
          rateLimitRemaining: log.rateLimitRemaining,
        },
      });
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('Failed to log API call:', error);
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof TypeError) {
      // Network errors (fetch failed, connection refused, etc.)
      return true;
    }
    if (error instanceof Error) {
      const retryableMessages = [
        'fetch failed',
        'network',
        'timeout',
        'ECONNREFUSED',
        'ETIMEDOUT',
      ];
      return retryableMessages.some(msg =>
        error.message.toLowerCase().includes(msg)
      );
    }
    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Helper function to extract answer values from JotForm submission
 */
export function extractAnswerValue(answer: any): any {
  if (!answer) return null;

  // Handle different answer types
  if (typeof answer.answer === 'object' && answer.answer !== null) {
    // Complex answers (full name, address, etc.)
    return answer.answer;
  }

  if (typeof answer.answer === 'string') {
    // Simple text answers
    return answer.answer;
  }

  if (Array.isArray(answer.answer)) {
    // Multiple choice or file uploads
    return answer.answer;
  }

  return answer.answer;
}

/**
 * Helper to find answer by field name or type
 */
export function findAnswerByName(
  answers: Record<string, any>,
  searchNames: string[]
): any {
  for (const answer of Object.values(answers)) {
    if (!answer) continue;

    // Check by field name
    if (searchNames.includes(answer.name)) {
      return extractAnswerValue(answer);
    }

    // Check by field type
    if (searchNames.includes(answer.type)) {
      return extractAnswerValue(answer);
    }

    // Check by text label (case-insensitive partial match)
    if (answer.text) {
      const textLower = answer.text.toLowerCase();
      for (const searchName of searchNames) {
        if (textLower.includes(searchName.toLowerCase())) {
          return extractAnswerValue(answer);
        }
      }
    }
  }

  return null;
}

/**
 * Map JotForm submission to applicant data
 */
export function mapSubmissionToApplicant(submission: JotFormSubmission): {
  jotform_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position_applied?: string;
  resume_url?: string;
} {
  const { answers } = submission;

  // Extract full name
  const fullName = findAnswerByName(answers, ['fullName', 'control_fullname', 'name']);
  let firstName = '';
  let lastName = '';

  if (fullName && typeof fullName === 'object') {
    firstName = fullName.first || '';
    lastName = fullName.last || '';
  }

  // Extract email
  const email = findAnswerByName(answers, ['email', 'control_email', 'emailAddress']) || '';

  // Extract phone
  const phoneAnswer = findAnswerByName(answers, ['phoneNumber', 'control_phone', 'phone']);
  let phone = '';
  if (typeof phoneAnswer === 'object' && phoneAnswer.full) {
    phone = phoneAnswer.full;
  } else if (typeof phoneAnswer === 'string') {
    phone = phoneAnswer;
  }

  // Extract position
  const position = findAnswerByName(answers, ['positionApplied', 'position', 'jobTitle']) || '';

  // Extract resume URL
  const resumeAnswer = findAnswerByName(answers, ['uploadResume', 'resume', 'cv']);
  let resumeUrl = '';
  if (Array.isArray(resumeAnswer) && resumeAnswer.length > 0) {
    resumeUrl = resumeAnswer[0];
  } else if (typeof resumeAnswer === 'string') {
    resumeUrl = resumeAnswer;
  }

  return {
    jotform_id: submission.id,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || undefined,
    position_applied: position || undefined,
    resume_url: resumeUrl || undefined,
  };
}
