export type ApplicantStatus = 'New' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';

export interface Applicant {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    position_applied?: string;
    status: ApplicantStatus;
    resume_url?: string;
    created_at: string;
    updated_at?: string;
}

export type OfferStatus = 'Draft' | 'Pending_Approval' | 'Sent' | 'Accepted' | 'Declined';

export interface Offer {
    id: string;
    applicant_id: string;
    status: OfferStatus;
    position_title: string;
    start_date: string;
    salary: number;
    offer_letter_url?: string;
    secure_token: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
    expires_at?: string;
    applicant?: Applicant; // For joined queries
}

export interface Employee {
    id: string;
    applicant_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    position?: string;
    department?: string;
    start_date?: string;
    status: 'Active' | 'Onboarding' | 'Terminated';
    employee_id?: string;
    wp_user_id?: number;
    created_at: string;
    updated_at: string;
}
