import React from 'react';

export type StatusType =
    | 'New'
    | 'Screening'
    | 'Interview'
    | 'Offer'
    | 'Hired'
    | 'Rejected'
    | 'Accepted'
    | 'Draft'
    | 'Pending Approval'
    | 'Sent'
    | 'Declined'
    | 'Onboarding'
    | 'Onboarding Started'
    | 'Onboarding Completed'
    | 'Active'
    | 'Suspended'
    | 'Terminated';

interface StatusBadgeProps {
    status: StatusType | string;
    size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const getStatusStyles = () => {
        switch (status) {
            case 'New':
                return 'bg-[rgba(162,161,168,0.1)] text-[#16151C] dark:text-white border-[rgba(162,161,168,0.2)]';
            case 'Screening':
            case 'Interview':
                return 'bg-[rgba(59,130,246,0.1)] text-[#3B82F6] border-[rgba(59,130,246,0.2)]';
            case 'Accepted':
            case 'Sent':
            case 'Offer':
            case 'Hired':
                return 'bg-[rgba(113,82,243,0.1)] text-[#7152F3] border-[rgba(113,82,243,0.2)]';
            case 'Pending Approval':
                return 'bg-[rgba(234,179,8,0.1)] text-[#EAB308] border-[rgba(234,179,8,0.2)]';
            case 'Onboarding':
            case 'Onboarding Started':
                return 'bg-[rgba(20,184,166,0.1)] text-[#14B8A6] border-[rgba(20,184,166,0.2)]';
            case 'Onboarding Completed':
            case 'Active':
                return 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] border-[rgba(34,197,94,0.2)]';
            case 'Rejected':
            case 'Declined':
            case 'Terminated':
                return 'bg-[rgba(239,68,68,0.1)] text-[#EF4444] border-[rgba(239,68,68,0.2)]';
            case 'Suspended':
                return 'bg-[rgba(249,115,22,0.1)] text-[#F97316] border-[rgba(249,115,22,0.2)]';
            case 'Draft':
                return 'bg-[rgba(100,116,139,0.1)] text-[#64748B] border-[rgba(100,116,139,0.2)]';
            default:
                return 'bg-[rgba(162,161,168,0.1)] text-[#16151C] dark:text-white border-[rgba(162,161,168,0.2)]';
        }
    };

    const sizeClasses = size === 'sm'
        ? 'px-2 py-0.5 text-xs font-light'
        : 'px-3 py-1 text-sm font-light';

    return (
        <span
            className={`inline-flex items-center rounded-[6px] border ${getStatusStyles()} ${sizeClasses}`}
        >
            {status}
        </span>
    );
}
