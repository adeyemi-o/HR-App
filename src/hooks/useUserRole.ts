import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'hr' | 'staff';

export function useUserRole() {
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching user role:', error);
                } else if (data) {
                    setRole(data.role as UserRole);
                }
            } catch (error) {
                console.error('Failed to fetch role:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, []);

    return { role, loading, isAdmin: role === 'admin', isHR: role === 'hr', isStaff: role === 'staff' };
}
