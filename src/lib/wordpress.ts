const WP_API_URL = import.meta.env.VITE_WP_API_URL;
const WP_USERNAME = import.meta.env.VITE_WP_USERNAME;
const WP_APP_PASSWORD = import.meta.env.VITE_WP_APP_PASSWORD;

if (!WP_API_URL) {
    console.warn('VITE_WP_API_URL is not defined');
}

/**
 * Generic wrapper for WordPress REST API calls
 */
export const wpClient = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    // For MVP, we use env vars. In Phase 4.2 (Settings Persistence), we will fetch these from Supabase.
    if (!WP_API_URL || !WP_USERNAME || !WP_APP_PASSWORD) {
        console.error('WordPress configuration is missing');
        throw new Error('WordPress configuration is missing. Please check your settings.');
    }

    // Basic Auth for WordPress Application Passwords
    const auth = btoa(`${WP_USERNAME}:${WP_APP_PASSWORD}`);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        ...options.headers,
    };

    try {
        const response = await fetch(`${WP_API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `WordPress API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        console.error('WordPress API Request Failed:', error);
        throw error;
    }
};
