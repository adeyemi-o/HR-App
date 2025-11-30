import { supabase } from '@/lib/supabase';

export interface Setting {
    id: string;
    key: string;
    value: string;
    description?: string;
    is_encrypted: boolean;
    updated_at: string;
}

export const settingsService = {
    async getSettings(): Promise<Record<string, string>> {
        const { data, error } = await supabase
            .from('settings')
            .select('key, value');

        if (error) {
            console.error('Error fetching settings:', error);
            throw error;
        }

        // Convert array to object for easier access
        return data.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);
    },

    async updateSetting(key: string, value: string): Promise<void> {
        const { error } = await supabase
            .from('settings')
            .upsert({ key, value }, { onConflict: 'key' });

        if (error) {
            console.error(`Error updating setting ${key}:`, error);
            throw error;
        }
    },

    async updateSettings(settings: Record<string, string>): Promise<void> {
        // Update multiple settings in parallel
        const updates = Object.entries(settings).map(([key, value]) =>
            this.updateSetting(key, value)
        );

        await Promise.all(updates);
    }
};
