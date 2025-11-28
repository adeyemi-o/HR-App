import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    lastUpdated?: string;
    iconColor?: string;
    iconBgColor?: string;
    subtitle?: string;
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    iconColor = 'text-[#7152F3]',
    iconBgColor = 'bg-[rgba(113,82,243,0.1)]',
    subtitle
}: StatsCardProps) {
    return (
        <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] dark:border-border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`${iconBgColor} ${iconColor} p-3 rounded-[10px]`}>
                    <Icon size={20} strokeWidth={1.5} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-light ${trend.isPositive
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                        <span>{trend.isPositive ? '↑' : '↓'}</span>
                        <span>{trend.value}%</span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-[#A2A1A8] text-sm font-light mb-1">{title}</p>
                <p className="text-[#16151C] dark:text-foreground text-[32px] font-semibold leading-[40px]">{value}</p>
                {subtitle && (
                    <p className="text-[#A2A1A8] text-xs font-light mt-1">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
