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
    },

    async moveApplicantToEmployee(applicantId: string) {
        // 1. Get applicant details
        const { data: applicant, error: appError } = await supabase
            .from('applicants')
            .select('*')
            .eq('id', applicantId)
            .single();

        if (appError) throw appError;
        if (!applicant) throw new Error('Applicant not found');

        // 2. Check if employee already exists
        const { data: existingEmployee } = await supabase
            .from('employees')
            .select('id')
            .eq('applicant_id', applicantId)
            .single();

        if (existingEmployee) {
            throw new Error('Employee record already exists for this applicant');
        }

        // 3. Create employee record with applicant data
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .insert({
                applicant_id: applicant.id,
                first_name: applicant.first_name,
                last_name: applicant.last_name,
                email: applicant.email,
                phone: applicant.phone,
                position: applicant.position_applied || 'To Be Assigned',
                start_date: new Date().toISOString().split('T')[0], // Today's date
                status: 'Onboarding', // Set as Onboarding initially (will change to Active when courses complete)
                employee_id: `EMP-${Date.now().toString().slice(-6)}` // Generate unique ID
            })
            .select()
            .single();

        if (empError) throw empError;

        // 4. Update applicant status to Hired
        const { error: updateError } = await supabase
            .from('applicants')
            .update({ status: 'Hired' })
            .eq('id', applicantId);

        if (updateError) {
            console.error('Failed to update applicant status', updateError);
            // Don't throw error here, as employee was already created successfully
            // But we should log it for investigation
        }

        return employee as Employee;
    },

    async syncEmployeeToWordPress(employeeId: string, createIfNotExists: boolean = false) {
        // 1. Get employee details
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', employeeId)
            .single();

        if (empError) throw empError;
        if (!employee) throw new Error('Employee not found');

        // 2. Check if already synced
        if (employee.wp_user_id) {
            return {
                success: true,
                message: 'Employee already synced to WordPress',
                wp_user_id: employee.wp_user_id,
                action: 'already_synced'
            };
        }

        // 3. Search for WordPress user by email
        const wpUser = await wordpressService.findUserByEmail(employee.email);

        if (wpUser) {
            // Found existing WordPress user - link them
            await supabase
                .from('employees')
                .update({ wp_user_id: wpUser.id })
                .eq('id', employeeId);

            return {
                success: true,
                message: `Linked to existing WordPress user: ${wpUser.username}`,
                wp_user_id: wpUser.id,
                action: 'linked_existing'
            };
        }

        // 4. If no WordPress user found and createIfNotExists is true, create one
        if (createIfNotExists) {
            try {
                const newWpUser = await wordpressService.createUser(employee as Employee);

                await supabase
                    .from('employees')
                    .update({ wp_user_id: newWpUser.id })
                    .eq('id', employeeId);

                return {
                    success: true,
                    message: `Created new WordPress user: ${newWpUser.username}`,
                    wp_user_id: newWpUser.id,
                    action: 'created_new'
                };
            } catch (wpError: any) {
                throw new Error(`Failed to create WordPress user: ${wpError.message}`);
            }
        }

        // 5. No WordPress user found and not creating a new one
        return {
            success: false,
            message: 'No WordPress user found with this email',
            wp_user_id: null,
            action: 'not_found'
        };
    },

    async updateEmployee(employeeId: string, updates: Partial<Employee>) {
        const { data, error } = await supabase
            .from('employees')
            .update(updates)
            .eq('id', employeeId)
            .select()
            .single();

        if (error) throw error;
        return data as Employee;
    },

    async syncApplicantStatusToHired(employeeId: string) {
        // Get employee to find the applicant_id
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('applicant_id')
            .eq('id', employeeId)
            .single();

        if (empError) throw empError;
        if (!employee || !employee.applicant_id) {
            throw new Error('Employee has no linked applicant');
        }

        // Update applicant status to Hired
        const { error: updateError } = await supabase
            .from('applicants')
            .update({ status: 'Hired' })
            .eq('id', employee.applicant_id);

        if (updateError) throw updateError;

        return { success: true };
    }
};
