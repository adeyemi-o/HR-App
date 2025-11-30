import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/hooks/useUserRole';

export interface UserProfile {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: UserRole;
    created_at: string;
}

export const userService = {
    async getUsers(): Promise<UserProfile[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            throw error;
        }

        return data as UserProfile[];
    },

    async updateUserRole(userId: string, role: UserRole): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', userId);

        if (error) {
            console.error(`Error updating role for user ${userId}:`, error);
            throw error;
        }
    }
};
