export interface WPUser {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    roles: string[];
    url: string;
    link: string;
    slug: string;
    registered_date: string;
}

export interface LearnDashGroup {
    id: number;
    title: {
        rendered: string;
    };
    status: string;
    link: string;
}

export interface CourseProgress {
    course_id: number;
    user_id: number;
    status: 'not-started' | 'in-progress' | 'completed';
    steps_completed: number;
    steps_total: number;
    percentage: number;
    last_active?: string;
    completion_date?: string;
}

export interface WPError {
    code: string;
    message: string;
    data: {
        status: number;
    };
}
