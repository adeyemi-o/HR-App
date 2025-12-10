import { supabase } from './supabase';

// Cache for WordPress settings to avoid repeated DB queries
let wpSettingsCache: { url: string; username: string; password: string } | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches WordPress credentials from Supabase settings
 */
async function getWPCredentials(): Promise<{ url: string; username: string; password: string }> {
    // Return cached credentials if still valid
    if (wpSettingsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
        return wpSettingsCache;
    }

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', ['wp_api_url', 'wp_username', 'wp_app_password']);

        if (error) throw error;

        const settings = data.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);

        // Fallback to environment variables if settings not found
        const url = settings.wp_api_url || import.meta.env.VITE_WP_API_URL;
        const username = settings.wp_username || import.meta.env.VITE_WP_USERNAME;
        const password = settings.wp_app_password || import.meta.env.VITE_WP_APP_PASSWORD;

        if (!url || !username || !password) {
            throw new Error('WordPress configuration is incomplete. Please configure in Settings.');
        }

        wpSettingsCache = { url, username, password };
        cacheTimestamp = Date.now();

        return wpSettingsCache;
    } catch (error) {
        console.error('Failed to fetch WordPress credentials:', error);
        throw new Error('WordPress configuration is missing. Please check your settings.');
    }
}

/**
 * Generic wrapper for WordPress REST API calls
 */
export const wpClient = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const { url, username, password } = await getWPCredentials();

    // Basic Auth for WordPress Application Passwords
    const auth = btoa(`${username}:${password}`);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        ...options.headers,
    };

    try {
        const response = await fetch(`${url}${endpoint}`, {
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
