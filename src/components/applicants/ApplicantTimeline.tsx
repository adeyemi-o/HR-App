import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, Calendar, FileText, UserCheck } from 'lucide-react';

interface TimelineEvent {
    date: Date;
    title: string;
    description: string;
    status: 'completed' | 'pending' | 'upcoming';
    icon?: React.ReactNode;
}

interface ApplicantTimelineProps {
    applicant: any;
}

export function ApplicantTimeline({ applicant }: ApplicantTimelineProps) {
    // Build timeline events from applicant data
    const buildTimeline = (): TimelineEvent[] => {
        const events: TimelineEvent[] = [];

        // Application submitted
        if (applicant?.created_at) {
            events.push({
                date: new Date(applicant.created_at),
                title: 'Application Submitted',
                description: `${applicant.answers?.fullName?.first || 'Applicant'} submitted their application`,
                status: 'completed',
                icon: <FileText className="w-4 h-4" />
            });
        }

        // Documents completed
        const requiredForms = ['emergency_contact', 'i9_eligibility', 'vaccination', 'licenses', 'background_check'];
        const completedForms = requiredForms.filter(form => applicant?.[form]?.id);

        if (completedForms.length === requiredForms.length && applicant.emergency_contact?.created_at) {
            // Find the latest document submission date
            const latestDocDate = requiredForms
                .filter(form => applicant?.[form]?.created_at)
                .map(form => new Date(applicant[form].created_at))
                .sort((a, b) => b.getTime() - a.getTime())[0];

            if (latestDocDate) {
                events.push({
                    date: latestDocDate,
                    title: 'All Documents Completed',
                    description: 'All required compliance documents submitted',
                    status: 'completed',
                    icon: <CheckCircle className="w-4 h-4" />
                });
            }
        }

        // Interview scheduled (if status is interviewing)
        if (applicant?.status === 'interviewing') {
            events.push({
                date: new Date(), // Use current date as placeholder
                title: 'Interview Scheduled',
                description: 'Candidate moved to interview stage',
                status: 'completed',
                icon: <UserCheck className="w-4 h-4" />
            });
        }

        // Pending events based on status
        if (applicant?.status === 'new' || applicant?.status === 'screening') {
            events.push({
                date: new Date(),
                title: 'Review Pending',
                description: 'Application under review by HR team',
                status: 'pending',
                icon: <Clock className="w-4 h-4" />
            });

            events.push({
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                title: 'Interview',
                description: 'Schedule interview if qualified',
                status: 'upcoming',
                icon: <Calendar className="w-4 h-4" />
            });
        }

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    const timeline = buildTimeline();

    return (
        <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
            <h3 className="text-lg font-semibold text-[#16151C] dark:text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#7152F3]" />
                Application Timeline
            </h3>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-[10px] bottom-[10px] w-0.5 bg-gradient-to-b from-[#7152F3] via-[rgba(113,82,243,0.5)] to-[rgba(162,161,168,0.2)]" />

                {/* Timeline events */}
                <div className="space-y-6">
                    {timeline.map((event, index) => (
                        <TimelineItem
                            key={index}
                            event={event}
                            isLast={index === timeline.length - 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

interface TimelineItemProps {
    event: TimelineEvent;
    isLast: boolean;
}

function TimelineItem({ event, isLast }: TimelineItemProps) {
    const getStatusStyles = (status: TimelineEvent['status']) => {
        switch (status) {
            case 'completed':
                return {
                    dot: 'bg-green-500 ring-green-100 dark:ring-green-900/30',
                    icon: 'text-white',
                    title: 'text-[#16151C] dark:text-white',
                    date: 'text-green-600 dark:text-green-400',
                    description: 'text-[#A2A1A8]'
                };
            case 'pending':
                return {
                    dot: 'bg-[#7152F3] ring-purple-100 dark:ring-purple-900/30 animate-pulse',
                    icon: 'text-white',
                    title: 'text-[#16151C] dark:text-white font-semibold',
                    date: 'text-[#7152F3]',
                    description: 'text-[#A2A1A8]'
                };
            case 'upcoming':
                return {
                    dot: 'bg-[rgba(162,161,168,0.3)] ring-gray-100 dark:ring-gray-800',
                    icon: 'text-[#A2A1A8]',
                    title: 'text-[#A2A1A8]',
                    date: 'text-[#A2A1A8]',
                    description: 'text-[#A2A1A8]'
                };
        }
    };

    const styles = getStatusStyles(event.status);

    return (
        <div className="relative flex gap-4 group">
            {/* Status dot with icon */}
            <div className="relative flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ${styles.dot} transition-all group-hover:scale-110`}>
                    <span className={styles.icon}>
                        {event.icon || <CheckCircle className="w-4 h-4" />}
                    </span>
                </div>
            </div>

            {/* Event content */}
            <div className="flex-1 pb-6">
                <div className="flex items-start justify-between gap-4 mb-1">
                    <h4 className={`font-medium ${styles.title} transition-colors`}>
                        {event.title}
                    </h4>
                    <span className={`text-xs font-medium ${styles.date} whitespace-nowrap`}>
                        {event.status === 'upcoming' ? 'Expected' : format(event.date, 'MMM d, yyyy')}
                    </span>
                </div>
                <p className={`text-sm ${styles.description}`}>
                    {event.description}
                </p>
            </div>
        </div>
    );
}
