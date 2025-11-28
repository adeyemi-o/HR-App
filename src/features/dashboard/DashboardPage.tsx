import { Users, Send, CheckCircle2, AlertTriangle, Briefcase, UserX, RefreshCw } from 'lucide-react';
import { StatsCard } from './components/StatsCard';
import { RecentActivity } from './components/RecentActivity';
import { OnboardingSnapshot } from './components/OnboardingSnapshot';
import { ComplianceAlerts } from './components/ComplianceAlerts';
import { QuickActions } from './components/QuickActions';

export function DashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#16151C] dark:text-white">Dashboard</h1>
            </div>

            {/* Metrics Grid - Top Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Applicants"
                    value="24"
                    icon={Users}
                    trend={{ value: 12, isPositive: true }}
                    subtitle="Update: July 16, 2025"
                />
                <StatsCard
                    title="Offers Sent"
                    value="8"
                    icon={Send}
                    trend={{ value: 5, isPositive: true }}
                    subtitle="Update: July 14, 2025"
                />
                <StatsCard
                    title="Offers Accepted"
                    value="12"
                    icon={CheckCircle2}
                    trend={{ value: 15, isPositive: true }}
                />
                <StatsCard
                    title="Onboarding in Progress"
                    value="7"
                    icon={RefreshCw}
                    trend={{ value: 12, isPositive: true }}
                    subtitle="Update: July 12, 2025"
                />
            </div>

            {/* Metrics Grid - Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Employees"
                    value="156"
                    icon={Briefcase}
                    trend={{ value: 8, isPositive: true }}
                    subtitle="Update: July 14, 2025"
                />
                <StatsCard
                    title="Active Employees"
                    value="142"
                    icon={Briefcase}
                    trend={{ value: 5, isPositive: true }}
                />
                <StatsCard
                    title="Compliance Alerts"
                    value="4"
                    icon={AlertTriangle}
                    iconColor="text-orange-600"
                    iconBgColor="bg-[rgba(249,115,22,0.1)]"
                />
                <StatsCard
                    title="Terminated/Suspended"
                    value="3"
                    icon={UserX}
                    iconColor="text-red-600"
                    iconBgColor="bg-[rgba(239,68,68,0.1)]"
                />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Activity & Compliance */}
                <div className="lg:col-span-2 space-y-6">
                    <RecentActivity />
                    <ComplianceAlerts />
                </div>

                {/* Right Column - Onboarding Snapshot */}
                <div className="lg:col-span-1">
                    <OnboardingSnapshot />
                    <QuickActions />
                </div>
            </div>
        </div>
    );
}
