import { supabase } from '@/lib/supabase';
import type { Employee } from '@/types';

import { wordpressService } from '@/services/wordpressService';

export const employeeService = {
    async getEmployees() {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Employee[];
    },

    async getEmployeeById(id: string) {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Employee;
    },

    async createEmployeeFromApplicant(applicantId: string, offerDetails: { start_date: string; position: string; salary: number }) {
        // 1. Get applicant details
        const { data: applicant, error: appError } = await supabase
            .from('applicants')
            .select('*')
            .eq('id', applicantId)
            .single();

        if (appError) throw appError;
        if (!applicant) throw new Error('Applicant not found');

        // 1.5 Check if employee already exists
        const { data: existingEmployee } = await supabase
            .from('employees')
            .select('id')
            .eq('applicant_id', applicantId)
            .single();

        if (existingEmployee) {
            throw new Error('Employee record already exists for this applicant');
        }

        // 2. Create employee record
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .insert({
                applicant_id: applicant.id,
                first_name: applicant.first_name,
                last_name: applicant.last_name,
                email: applicant.email,
                phone: applicant.phone,
                position: offerDetails.position,
                start_date: offerDetails.start_date,
                status: 'Onboarding',
                // Generate a simple temp ID, in real app this might be more complex
                employee_id: `EMP-${Math.floor(Math.random() * 10000)}`
            })
            .select()
            .single();

        if (empError) throw empError;

        // 3. Update applicant status to Hired
        const { error: updateError } = await supabase
            .from('applicants')
            .update({ status: 'Hired' })
            .eq('id', applicantId);

        if (updateError) console.error('Failed to update applicant status', updateError);

        // 4. Create WordPress User & Assign Group (Integration)
        try {
            // Create WP User
            const wpUser = await wordpressService.createUser(employee as Employee);

            // Update Employee with WP User ID
            await supabase
                .from('employees')
                .update({ wp_user_id: wpUser.id })
                .eq('id', employee.id);

            // Assign to LearnDash Group (Mock logic for group selection based on position)
            // In a real app, we'd map Position -> Group ID
            const defaultGroupId = 123; // Placeholder
            await wordpressService.assignUserToGroup(wpUser.id, defaultGroupId);

        } catch (wpError) {
            console.error('Failed to create WordPress user:', wpError);
            // We don't throw here to avoid rolling back the employee creation, 
            // but we should probably alert the user or flag the employee record.
        }

        return employee as Employee;
    }
};
