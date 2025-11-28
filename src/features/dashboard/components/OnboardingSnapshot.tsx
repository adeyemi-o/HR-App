import { ProgressBar } from '@/components/ui/progress-bar';

interface OnboardingEmployee {
    name: string;
    role: string;
    progress: number;
}

const employees: OnboardingEmployee[] = [
    { name: 'Emma Thompson', role: 'Caregiver', progress: 85 },
    { name: 'James Garcia', role: 'Nurse', progress: 72 },
    { name: 'Olivia Davis', role: 'Caregiver', progress: 65 },
    { name: 'William Taylor', role: 'Nurse', progress: 90 },
    { name: 'Sophia Martinez', role: 'Caregiver', progress: 55 },
];

export function OnboardingSnapshot() {
    return (
        <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] dark:border-border overflow-hidden">
            <div className="p-6 border-b border-[rgba(162,161,168,0.1)] dark:border-border">
                <h3 className="text-[#16151C] dark:text-foreground font-semibold mb-1">Onboarding Snapshot</h3>
                <p className="text-sm text-[#A2A1A8] font-light">Top 5 employees in progress</p>
            </div>
            <div className="p-6 space-y-6">
                {employees.map((employee) => (
                    <div key={employee.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#16151C] dark:text-foreground font-light">{employee.name}</p>
                                <p className="text-xs text-[#A2A1A8] font-light">{employee.role}</p>
                            </div>
                            <span className="text-sm text-[#7152F3] font-semibold">{employee.progress}%</span>
                        </div>
                        <ProgressBar
                            progress={employee.progress}
                            showLabel={false}
                            size="sm"
                            color="purple"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
