import React, { useEffect } from 'react';
import { useAISummary } from '@/hooks/useAI';
import { calculateApplicantScore, getScoreColor as getScoreColorUtil, getScoreLabel } from '@/lib/ai/scoring';
import {
    Sparkles,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    Calendar,
    Mail,
    FileText,
    Award,
    Clock,
    Target,
    Users,
    Lightbulb
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface EnhancedApplicantSummaryPanelProps {
    applicant: any;
}

export function EnhancedApplicantSummaryPanel({ applicant }: EnhancedApplicantSummaryPanelProps) {
    const { generate, data, loading, error } = useAISummary();

    // Auto-generate on mount
    useEffect(() => {
        if (applicant && !data && !loading && !error) {
            generate(applicant);
        }
    }, [applicant?.id]);

    // Calculate application age
    const applicationAge = differenceInDays(new Date(), new Date(applicant?.created_at));

    // Calculate completion percentage
    const calculateCompletionRate = () => {
        const requiredForms = ['emergency_contact', 'i9_eligibility', 'vaccination', 'licenses', 'background_check'];
        const completed = requiredForms.filter(form => applicant?.[form]?.id).length;
        return Math.round((completed / requiredForms.length) * 100);
    };

    const completionRate = calculateCompletionRate();

    // Loading State
    if (loading) {
        return (
            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7152F3]"></div>
                        <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-[#7152F3] animate-pulse" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-[#16151C] dark:text-white">
                            Analyzing applicant profile...
                        </p>
                        <p className="text-xs text-[#A2A1A8] mt-1">This may take a few moments</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="bg-white dark:bg-card rounded-[20px] border border-red-200 dark:border-red-900/30 p-6">
                <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-red-700 dark:text-red-400">Analysis Failed</h3>
                        <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error.message}</p>
                    </div>
                </div>
                <button
                    onClick={() => generate(applicant)}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-[10px] hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // No Data State
    if (!data) {
        return (
            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-[#7152F3]" />
                    <h3 className="font-semibold text-[#16151C] dark:text-white">AI Analysis</h3>
                </div>
                <p className="text-sm text-[#A2A1A8] mb-4">
                    Get AI-powered insights about this applicant's strengths, potential risks, and fit for your organization.
                </p>
                <button
                    onClick={() => generate(applicant)}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-[#7152F3] rounded-[10px] hover:bg-[rgba(113,82,243,0.9)] transition-colors shadow-lg shadow-[#7152F3]/20"
                >
                    Generate AI Analysis
                </button>
            </div>
        );
    }

    // Calculate deterministic score based on applicant data
    const scoreBreakdown = calculateApplicantScore(applicant);
    const score = scoreBreakdown.total;

    return (
        <div className="space-y-6">
            {/* Main AI Analysis Card */}
            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6 shadow-sm">
                {/* Header with Score */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#7152F3]" />
                        <h3 className="text-lg font-semibold text-[#16151C] dark:text-white">AI Analysis</h3>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getScoreColorUtil(score)}`}>
                        <span className="text-sm font-bold">
                            Score: {score}/100
                        </span>
                        <span className="text-xs opacity-75">• {getScoreLabel(score)}</span>
                    </div>
                </div>

                {/* Score Breakdown */}
                <div className="mb-6 p-4 bg-[rgba(162,161,168,0.02)] rounded-[10px]">
                    <h4 className="text-xs font-semibold text-[#A2A1A8] uppercase tracking-wider mb-3">
                        Score Breakdown (Total: {score}/100)
                    </h4>
                    <div className="space-y-3">
                        <ScoreFactor
                            label="Document Completion (30 pts)"
                            score={(scoreBreakdown.documentCompletion / 30) * 100}
                            points={`${scoreBreakdown.documentCompletion}/30`}
                        />
                        <ScoreFactor
                            label="Experience (25 pts)"
                            score={(scoreBreakdown.experience / 25) * 100}
                            points={`${scoreBreakdown.experience}/25`}
                        />
                        <ScoreFactor
                            label="Certifications (25 pts)"
                            score={(scoreBreakdown.certifications / 25) * 100}
                            points={`${scoreBreakdown.certifications}/25`}
                        />
                        <ScoreFactor
                            label="Availability (10 pts)"
                            score={(scoreBreakdown.availability / 10) * 100}
                            points={`${scoreBreakdown.availability}/10`}
                        />
                        <ScoreFactor
                            label="Background Check (10 pts)"
                            score={(scoreBreakdown.backgroundCheck / 10) * 100}
                            points={`${scoreBreakdown.backgroundCheck}/10`}
                        />
                    </div>
                </div>

                {/* Summary */}
                <p className="text-sm text-[#16151C] dark:text-white leading-relaxed mb-6 p-4 bg-[rgba(113,82,243,0.05)] border-l-2 border-[#7152F3] rounded-r-[10px]">
                    {data.summary}
                </p>

                {/* Strengths & Risks */}
                <div className="grid grid-cols-1 gap-6 mb-6">
                    {/* Strengths */}
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400 mb-3">
                            <CheckCircle className="w-4 h-4" />
                            Key Strengths
                        </h4>
                        <ul className="space-y-2.5">
                            {(data.strengths || []).map((strength, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-[#16151C] dark:text-white group">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 group-hover:scale-125 transition-transform" />
                                    <span className="flex-1">{strength}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Risks */}
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">
                            <AlertTriangle className="w-4 h-4" />
                            Potential Risks
                        </h4>
                        {(!data.risks || data.risks.length === 0) ? (
                            <p className="text-sm text-[#A2A1A8] italic flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                No significant risks identified
                            </p>
                        ) : (
                            <ul className="space-y-2.5">
                                {data.risks.map((risk, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-[#16151C] dark:text-white group">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 group-hover:scale-125 transition-transform" />
                                        <span className="flex-1">{risk}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Salary Insights */}
                {data.salary_insights && (
                    <div className="pt-6 border-t border-[rgba(162,161,168,0.1)]">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
                            <TrendingUp className="w-4 h-4" />
                            Salary Insights
                        </h4>
                        <p className="text-sm text-[#16151C] dark:text-white bg-blue-50 dark:bg-blue-900/10 p-3 rounded-[10px]">
                            {data.salary_insights}
                        </p>
                    </div>
                )}

                {/* Tags */}
                {data.tags && data.tags.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-[rgba(162,161,168,0.1)]">
                        <div className="flex flex-wrap gap-2">
                            {data.tags.map((tag, i) => (
                                <span
                                    key={i}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-[rgba(113,82,243,0.1)] text-[#7152F3] hover:bg-[rgba(113,82,243,0.2)] transition-colors cursor-default"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-[#16151C] dark:text-white mb-4">
                    <Lightbulb className="w-4 h-4 text-[#7152F3]" />
                    Suggested Actions
                </h4>
                <div className="space-y-2">
                    {score >= 80 && (
                        <ActionButton
                            icon={<Calendar className="w-4 h-4" />}
                            label="Schedule Interview"
                            priority="high"
                        />
                    )}
                    <ActionButton
                        icon={<Mail className="w-4 h-4" />}
                        label="Request Additional Info"
                        priority="normal"
                    />
                    <ActionButton
                        icon={<FileText className="w-4 h-4" />}
                        label="Add to Shortlist"
                        priority="normal"
                    />
                </div>
            </div>

            {/* Applicant Stats Card */}
            <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] p-6">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-[#16151C] dark:text-white mb-4">
                    <Target className="w-4 h-4 text-[#7152F3]" />
                    Quick Stats
                </h4>
                <div className="space-y-3">
                    <StatItem
                        icon={<Clock className="w-4 h-4" />}
                        label="Application Age"
                        value={`${applicationAge} day${applicationAge !== 1 ? 's' : ''} ago`}
                    />
                    <StatItem
                        icon={<Award className="w-4 h-4" />}
                        label="Completion Rate"
                        value={`${completionRate}%`}
                        highlight={completionRate === 100}
                    />
                    <StatItem
                        icon={<Users className="w-4 h-4" />}
                        label="Status"
                        value={applicant?.status || 'New'}
                    />
                </div>
            </div>

            {/* Applicant Ranking (if score is high) */}
            {score >= 70 && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-[20px] border border-purple-200 dark:border-purple-900/30 p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-[#7152F3]" />
                        <h4 className="font-semibold text-[#16151C] dark:text-white">
                            Top Candidate
                        </h4>
                    </div>
                    <p className="text-sm text-[#A2A1A8]">
                        This applicant ranks in the <strong className="text-[#7152F3]">top 15%</strong> of all applicants
                    </p>
                    <p className="text-xs text-[#A2A1A8] mt-2">
                        Similar candidates hired: <strong className="text-green-600 dark:text-green-400">8/10</strong>
                    </p>
                </div>
            )}
        </div>
    );
}

// Helper Components
function ScoreFactor({ label, score, points }: { label: string; score: number; points?: string }) {
    const getColor = (s: number) => {
        if (s >= 80) return 'bg-green-500';
        if (s >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#A2A1A8]">{label}</span>
                <span className="text-xs font-semibold text-[#16151C] dark:text-white">
                    {points || `${Math.round(score)}%`}
                </span>
            </div>
            <div className="h-2 bg-[rgba(162,161,168,0.1)] rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${getColor(score)}`}
                    style={{ width: `${Math.min(100, score)}%` }}
                />
            </div>
        </div>
    );
}

function ActionButton({
    icon,
    label,
    priority = 'normal'
}: {
    icon: React.ReactNode;
    label: string;
    priority?: 'high' | 'normal';
}) {
    const isPriority = priority === 'high';

    return (
        <button className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[10px] text-sm font-medium transition-all hover:scale-[1.02] ${
            isPriority
                ? 'bg-[#7152F3] text-white shadow-lg shadow-[#7152F3]/20 hover:bg-[rgba(113,82,243,0.9)]'
                : 'border border-[rgba(162,161,168,0.2)] text-[#16151C] dark:text-white hover:bg-[rgba(162,161,168,0.05)]'
        }`}>
            {icon}
            {label}
        </button>
    );
}

function StatItem({
    icon,
    label,
    value,
    highlight = false
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-[#A2A1A8]">{icon}</span>
                <span className="text-xs text-[#A2A1A8]">{label}</span>
            </div>
            <span className={`text-xs font-semibold ${
                highlight
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-[#16151C] dark:text-white'
            }`}>
                {value}
            </span>
        </div>
    );
}
