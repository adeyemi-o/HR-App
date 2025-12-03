import { TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityItem } from '@/services/dashboardService';

interface RecentActivityProps {
    activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
    return (
        <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] dark:border-border overflow-hidden">
            <div className="p-6 border-b border-[rgba(162,161,168,0.1)] dark:border-border">
                <div className="flex items-center justify-between">
                    <h3 className="text-[#16151C] dark:text-foreground font-semibold">Recent Activity</h3>
                    <TrendingUp size={20} className="text-[#A2A1A8]" strokeWidth={1.5} />
                </div>
            </div>
            <div className="divide-y divide-[rgba(162,161,168,0.05)] dark:divide-border/50">
                {activities.length === 0 ? (
                    <div className="p-6 text-center text-sm text-[#A2A1A8]">
                        No recent activity
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div key={activity.id} className="p-4 hover:bg-[rgba(113,82,243,0.02)] dark:hover:bg-primary/5 transition-colors">
                            <p className="text-sm text-[#16151C] dark:text-foreground font-light mb-1">{activity.message}</p>
                            <p className="text-xs text-[#A2A1A8] font-light">
                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
