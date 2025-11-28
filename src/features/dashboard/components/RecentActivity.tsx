import { TrendingUp } from 'lucide-react';

const activities = [
    {
        id: 1,
        message: 'Maria Rodriguez moved from Screening to Accepted',
        timestamp: '2 hours ago',
    },
    {
        id: 2,
        message: 'Offer approved for John Smith (Nurse)',
        timestamp: '5 hours ago',
    },
    {
        id: 3,
        message: 'Offer sent to Sarah Johnson (Caregiver)',
        timestamp: '5 hours ago',
    },
    {
        id: 4,
        message: 'David Lee completed "HIPAA Training"',
        timestamp: '6 hours ago',
    },
    {
        id: 5,
        message: 'Emily Chen accepted offer',
        timestamp: '1 day ago',
    },
];

export function RecentActivity() {
    return (
        <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] dark:border-border overflow-hidden">
            <div className="p-6 border-b border-[rgba(162,161,168,0.1)] dark:border-border">
                <div className="flex items-center justify-between">
                    <h3 className="text-[#16151C] dark:text-foreground font-semibold">Recent Activity</h3>
                    <TrendingUp size={20} className="text-[#A2A1A8]" strokeWidth={1.5} />
                </div>
            </div>
            <div className="divide-y divide-[rgba(162,161,168,0.05)] dark:divide-border/50">
                {activities.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-[rgba(113,82,243,0.02)] dark:hover:bg-primary/5 transition-colors">
                        <p className="text-sm text-[#16151C] dark:text-foreground font-light mb-1">{activity.message}</p>
                        <p className="text-xs text-[#A2A1A8] font-light">{activity.timestamp}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
