import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/hooks/useUserRole';

export interface UserProfile {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    role: UserRole;
    created_at: string;
}

export interface ProfileChangeRequest {
    id: string;
    user_id: string;
    changes: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone_number?: string;
    };
    status: 'pending' | 'approved' | 'rejected';
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
    },

    async createProfileChangeRequest(changes: ProfileChangeRequest['changes']): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('profile_change_requests')
            .insert({
                user_id: user.id,
                changes,
                status: 'pending'
            });

        if (error) throw error;
    },

    async getPendingRequest(): Promise<ProfileChangeRequest | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profile_change_requests')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (error) throw error;
        return data as ProfileChangeRequest;
    },

    async getAllPendingRequests(): Promise<(ProfileChangeRequest & { profiles: UserProfile })[]> {
        const { data, error } = await supabase
            .from('profile_change_requests')
            .select('*, profiles(*)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as any;
    },

    async approveRequest(requestId: string): Promise<void> {
        const { error } = await supabase.functions.invoke('approve-profile-request', {
            body: { requestId, action: 'approve' }
        });
        if (error) throw error;
    },

    async rejectRequest(requestId: string): Promise<void> {
        const { error } = await supabase.functions.invoke('approve-profile-request', {
            body: { requestId, action: 'reject' }
        });
        if (error) throw error;
    },

    async adminUpdateUser(userId: string, updates: any): Promise<void> {
        const { error } = await supabase.functions.invoke('admin-update-user', {
            body: { userId, updates }
        });
        if (error) throw error;
    }
};
