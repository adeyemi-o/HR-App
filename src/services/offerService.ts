import { supabase } from '@/lib/supabase';
import type { Offer } from '@/types';

export const offerService = {
    async getOffers() {
        const { data, error } = await supabase
            .from('offers')
            .select('*, applicant:applicants(first_name, last_name, email, status)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Offer[];
    },

    async getOfferById(id: string) {
        const { data, error } = await supabase
            .from('offers')
            .select('*, applicant:applicants(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Offer;
    },

    async createOffer(offer: Partial<Offer>) {
        const { data, error } = await supabase
            .from('offers')
            .insert(offer)
            .select()
            .single();

        if (error) throw error;
        return data as Offer;
    },

    async updateStatus(id: string, status: string) {
        const { error } = await supabase
            .from('offers')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    },

    async getOfferByToken(token: string) {
        const { data, error } = await supabase
            .from('offers')
            .select('*, applicant:applicants(*)')
            .eq('secure_token', token)
            .single();

        if (error) throw error;
        return data as Offer;
    },

    async respondToOffer(token: string, status: 'Accepted' | 'Declined') {
        const { data, error } = await supabase.rpc('respond_to_offer', {
            token_arg: token,
            status_arg: status
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
    }
};
