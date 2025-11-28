import { AlertTriangle } from 'lucide-react';

interface Alert {
    id: string;
    type: 'CPR' | 'TB Test' | 'CNA License';
    person: string;
    expiry: string;
    daysLeft: number;
    severity: 'high' | 'medium' | 'low';
}

const alerts: Alert[] = [
    {
        id: '1',
        type: 'CPR',
        person: 'Jennifer Martinez',
        expiry: '2025-12-05',
        daysLeft: 2,
        severity: 'high'
    },
    {
        id: '2',
        type: 'TB Test',
        person: 'Michael Brown',
        expiry: '2025-12-15',
        daysLeft: 12,
        severity: 'medium'
    },
    {
        id: '3',
        type: 'CNA License',
        person: 'Lisa Anderson',
        expiry: '2026-01-10',
        daysLeft: 45,
        severity: 'low'
    },
    {
        id: '4',
        type: 'CPR',
        person: 'Robert Wilson',
        expiry: '2025-12-08',
        daysLeft: 10,
        severity: 'medium'
    }
];

export function ComplianceAlerts() {
    return (
        <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] dark:border-border overflow-hidden">
            <div className="p-6 border-b border-[rgba(162,161,168,0.1)] dark:border-border">
                <div className="flex items-center justify-between">
                    <h3 className="text-[#16151C] dark:text-foreground font-semibold">Compliance Alerts</h3>
                    <AlertTriangle size={20} className="text-orange-500" strokeWidth={1.5} />
                </div>
            </div>
            <div className="divide-y divide-[rgba(162,161,168,0.05)] dark:divide-border/50">
                {alerts.map((alert) => {
                    const severityColors = {
                        high: 'text-red-600 bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)] dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400',
                        medium: 'text-orange-600 bg-[rgba(249,115,22,0.1)] border-[rgba(249,115,22,0.2)] dark:bg-orange-900/20 dark:border-orange-900/30 dark:text-orange-400',
                        low: 'text-yellow-600 bg-[rgba(234,179,8,0.1)] border-[rgba(234,179,8,0.2)] dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-400',
                    };

                    return (
                        <div key={alert.id} className="p-4 hover:bg-[rgba(113,82,243,0.02)] dark:hover:bg-primary/5 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 text-xs font-light rounded-[6px] border ${severityColors[alert.severity]}`}>
                                            {alert.type}
                                        </span>
                                        <span className="text-sm text-[#16151C] dark:text-foreground font-light">{alert.person}</span>
                                    </div>
                                    <p className="text-xs text-[#A2A1A8] font-light">
                                        Expires: {alert.expiry} ({alert.daysLeft} days)
                                    </p>
                                </div>
                                <AlertTriangle
                                    size={18}
                                    strokeWidth={1.5}
                                    className={alert.severity === 'high' ? 'text-red-500' : alert.severity === 'medium' ? 'text-orange-500' : 'text-yellow-500'}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
