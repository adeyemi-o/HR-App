import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Applicant } from '@/types';

export const useApplicants = () => {
    return useQuery({
        queryKey: ['applicants'],
        queryFn: async () => {
            const { data, error } = await supabase.functions.invoke('listApplicants');

            if (error) {
                throw error;
            }

            return data as Applicant[];
        },
    });
};
