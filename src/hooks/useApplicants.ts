import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Applicant } from '@/types';

export const useApplicants = () => {
    return useQuery({
        queryKey: ['applicants'],
        queryFn: async () => {
            const { data, error } = await supabase.functions.invoke('listApplicants');

            if (error) {
                console.error('listApplicants error:', error);
                console.error('Error details:', JSON.stringify(error, null, 2));

                // Try to extract error message from different possible structures
                const errorMessage = error.message || error.msg || JSON.stringify(error);
                throw new Error(`Failed to load applicants: ${errorMessage}`);
            }

            // Check if data contains an error (Edge Function returned error in response body)
            if (data && typeof data === 'object' && 'error' in data) {
                console.error('Edge Function returned error:', data);
                const errorDetails = [
                    data.error,
                    data.code ? `Code: ${data.code}` : null,
                    data.details ? `Details: ${data.details}` : null,
                    data.hint ? `Hint: ${data.hint}` : null
                ].filter(Boolean).join(' | ');
                throw new Error(errorDetails);
            }

            return data as Applicant[];
        },
    });
};
