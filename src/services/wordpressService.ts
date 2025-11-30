import { wpClient } from '@/lib/wordpress';
import type { WPUser, CourseProgress, LearnDashGroup } from '@/types/wordpress';
import type { Employee } from '@/types';

export const wordpressService = {
    /**
     * Creates a new WordPress user for the employee
     */
    async createUser(employee: Employee): Promise<WPUser> {
        // Generate a temporary secure password
        const password = Math.random().toString(36).slice(-10) + 'Aa1!';

        return wpClient<WPUser>('/wp/v2/users', {
            method: 'POST',
            body: JSON.stringify({
                username: employee.email, // Use email as username for consistency
                email: employee.email,
                first_name: employee.first_name,
                last_name: employee.last_name,
                password: password,
                roles: ['subscriber'], // Default role for LearnDash students
            }),
        });
    },

    /**
     * Assigns a user to a LearnDash group
     */
    async assignUserToGroup(userId: number, groupId: number): Promise<void> {
        return wpClient<void>(`/ldlms/v2/groups/${groupId}/users`, {
            method: 'POST',
            body: JSON.stringify({
                user_ids: [userId],
            }),
        });
    },

    /**
     * Fetches course progress for a user
     */
    async getCourseProgress(userId: number): Promise<CourseProgress[]> {
        return wpClient<CourseProgress[]>(`/ldlms/v2/users/${userId}/course-progress`, {
            method: 'GET',
        });
    },

    /**
     * Fetches all available LearnDash groups
     */
    async getGroups(): Promise<LearnDashGroup[]> {
        return wpClient<LearnDashGroup[]>('/ldlms/v2/groups', {
            method: 'GET',
        });
    }
};
