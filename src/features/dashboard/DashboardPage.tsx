import { useEffect, useState } from 'react';
import { Users, Send, CheckCircle2, AlertTriangle, Briefcase, UserX, RefreshCw } from 'lucide-react';
import { StatsCard } from './components/StatsCard';
import { RecentActivity } from './components/RecentActivity';
import { OnboardingSnapshot } from './components/OnboardingSnapshot';
import { ComplianceAlerts } from './components/ComplianceAlerts';
import { QuickActions } from './components/QuickActions';
import { dashboardService, type DashboardStats, type ActivityItem, type OnboardingEmployee } from '@/services/dashboardService';

export function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalApplicants: 0,
        offersSent: 0,
        offersAccepted: 0,
        onboardingInProgress: 0,
        totalEmployees: 0,
        activeEmployees: 0
    });
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [onboardingSnapshot, setOnboardingSnapshot] = useState<OnboardingEmployee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [statsData, activityData, onboardingData] = await Promise.all([
                    dashboardService.getStats(),
                    dashboardService.getRecentActivity(),
                    dashboardService.getOnboardingSnapshot()
                ]);

                setStats(statsData);
                setRecentActivity(activityData);
                setOnboardingSnapshot(onboardingData);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#16151C] dark:text-white">Dashboard</h1>
            </div>

            {/* Metrics Grid - Top Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Applicants"
                    value={stats.totalApplicants.toString()}
                    icon={Users}
                    // trend={{ value: 12, isPositive: true }} // TODO: Implement trend logic
                    subtitle="All time"
                />
                <StatsCard
                    title="Offers Sent"
                    value={stats.offersSent.toString()}
                    icon={Send}
                    // trend={{ value: 5, isPositive: true }}
                    subtitle="Pending response"
                />
                <StatsCard
                    title="Offers Accepted"
                    value={stats.offersAccepted.toString()}
                    icon={CheckCircle2}
                    // trend={{ value: 15, isPositive: true }}
                    subtitle="All time"
                />
                <StatsCard
                    title="Onboarding in Progress"
                    value={stats.onboardingInProgress.toString()}
                    icon={RefreshCw}
                    // trend={{ value: 12, isPositive: true }}
                    subtitle="Active onboarding"
                />
            </div>

            {/* Metrics Grid - Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Employees"
                    value={stats.totalEmployees.toString()}
                    icon={Briefcase}
                    // trend={{ value: 8, isPositive: true }}
                    subtitle="All records"
                />
                <StatsCard
                    title="Active Employees"
                    value={stats.activeEmployees.toString()}
                    icon={Briefcase}
                    // trend={{ value: 5, isPositive: true }}
                    subtitle="Currently active"
                />
                <StatsCard
                    title="Compliance Alerts"
                    value="0" // Mocked for now
                    icon={AlertTriangle}
                    iconColor="text-orange-600"
                    iconBgColor="bg-[rgba(249,115,22,0.1)]"
                    subtitle="Coming soon"
                />
                <StatsCard
                    title="Terminated/Suspended"
                    value={(stats.totalEmployees - stats.activeEmployees - stats.onboardingInProgress).toString()} // Rough estimate
                    icon={UserX}
                    iconColor="text-red-600"
                    iconBgColor="bg-[rgba(239,68,68,0.1)]"
                    subtitle="Inactive"
                />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Activity & Compliance */}
                <div className="lg:col-span-2 space-y-6">
                    <RecentActivity activities={recentActivity} />
                    <ComplianceAlerts />
                </div>

                {/* Right Column - Onboarding Snapshot */}
                <div className="lg:col-span-1">
                    <OnboardingSnapshot employees={onboardingSnapshot} />
                    <QuickActions />
                </div>
            </div>
        </div>
    );
}
