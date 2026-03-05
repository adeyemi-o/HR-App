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
    async getCourseProgress(userId: number, includeTitles: boolean = true): Promise<CourseProgress[]> {
        try {
            const startTime = performance.now();
            console.log('[getCourseProgress] Fetching progress for user:', userId, { includeTitles });

            const progress = await wpClient<any[]>(`/ldlms/v2/users/${userId}/course-progress`, {
                method: 'GET',
            });

            console.log('[getCourseProgress] Progress data fetched in', Math.round(performance.now() - startTime), 'ms');

            let courseTitleMap = new Map<number, string>();

            if (includeTitles) {
                // Extract all unique course IDs
                const courseIds = [...new Set(progress.map(item => item.course).filter(Boolean))];
                console.log('[getCourseProgress] Fetching', courseIds.length, 'course titles...');

                // Fetch all courses in a single batch request (much faster!)
                const courseFetchStart = performance.now();
                const coursePromises = courseIds.map(id =>
                    wpClient<any>(`/ldlms/v2/sfwd-courses/${id}`, { method: 'GET' })
                        .catch(err => {
                            console.warn(`Failed to fetch course ${id}:`, err.message);
                            return null;
                        })
                );

                const courses = await Promise.all(coursePromises);
                console.log('[getCourseProgress] All courses fetched in', Math.round(performance.now() - courseFetchStart), 'ms');

                // Create a map of course ID to title for quick lookup
                courses.forEach((course, index) => {
                    if (course) {
                        const rawTitle = course.title?.rendered || `Course ${courseIds[index]}`;
                        // Decode HTML entities
                        const decodedTitle = new DOMParser()
                            .parseFromString(rawTitle, 'text/html')
                            .documentElement.textContent || rawTitle;
                        courseTitleMap.set(courseIds[index], decodedTitle);
                    }
                });
            } else {
                console.log('[getCourseProgress] Skipping course title fetch as requested.');
            }

            // Map progress data with course titles
            const progressWithTitles = progress.map(item => {
                const courseId = item.course;
                const percentage = item.steps_total > 0
                    ? Math.round((item.steps_completed / item.steps_total) * 100)
                    : 0;

                return {
                    course_id: courseId,
                    user_id: userId,
                    status: item.progress_status as 'not-started' | 'in-progress' | 'completed',
                    steps_completed: item.steps_completed,
                    steps_total: item.steps_total,
                    percentage,
                    course_title: courseTitleMap.get(courseId) || `Course ${courseId}`,
                    last_active: item.date_started || undefined,
                    completion_date: item.date_completed || undefined,
                };
            });

            console.log('[getCourseProgress] Total time:', Math.round(performance.now() - startTime), 'ms');
            return progressWithTitles as CourseProgress[];
        } catch (error) {
            console.error('[getCourseProgress] Error fetching course progress:', error);
            throw error;
        }
    },

    /**
     * Fetches all available LearnDash groups
     */
    async getGroups(): Promise<LearnDashGroup[]> {
        return wpClient<LearnDashGroup[]>('/ldlms/v2/groups', {
            method: 'GET',
        });
    },

    /**
     * Finds a WordPress user by email address
     */
    async findUserByEmail(email: string): Promise<WPUser | null> {
        try {
            console.log('[findUserByEmail] Searching for email:', email);

            // IMPORTANT: Use context=edit to get email addresses in WordPress REST API
            // This requires authentication with a user that has edit_users capability

            // Approach 1: Search by email with context=edit
            console.log('[findUserByEmail] Attempt 1: Searching with search parameter and context=edit...');
            let users = await wpClient<WPUser[]>(`/wp/v2/users?search=${encodeURIComponent(email)}&context=edit`, {
                method: 'GET',
            });

            console.log('[findUserByEmail] Search results count:', users.length);
            if (users.length > 0) {
                console.log('[findUserByEmail] Search returned users:', users.map(u => ({
                    id: u.id,
                    email: u.email || 'NO_EMAIL',
                    username: u.username
                })));
            }

            // Find exact email match (case-insensitive) with null check
            let exactMatch = users.find(user =>
                user.email && user.email.toLowerCase() === email.toLowerCase()
            );

            if (exactMatch) {
                console.log('[findUserByEmail] ✓ Found exact match via search:', { id: exactMatch.id, email: exactMatch.email });
                return exactMatch;
            }

            // Approach 2: Fetch all users with context=edit and filter
            console.log('[findUserByEmail] Attempt 2: Fetching all users (per_page=100) with context=edit...');
            users = await wpClient<WPUser[]>(`/wp/v2/users?per_page=100&context=edit`, {
                method: 'GET',
            });

            console.log('[findUserByEmail] All users count:', users.length);
            console.log('[findUserByEmail] All users emails:', users.map(u => u.email || 'NO_EMAIL'));

            exactMatch = users.find(user =>
                user.email && user.email.toLowerCase() === email.toLowerCase()
            );

            if (exactMatch) {
                console.log('[findUserByEmail] ✓ Found exact match in full list:', { id: exactMatch.id, email: exactMatch.email });
                return exactMatch;
            }

            console.log('[findUserByEmail] ✗ No WordPress user found with email:', email);
            return null;
        } catch (error) {
            console.error('[findUserByEmail] Error finding WordPress user:', error);
            return null;
        }
    }
};
