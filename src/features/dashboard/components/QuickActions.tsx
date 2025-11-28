import { UserPlus, FileCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const actions = [
    {
        name: 'Add Applicant',
        href: '/applicants/new',
        icon: UserPlus,
    },
    {
        name: 'Review Offers',
        href: '/offers',
        icon: FileCheck,
    },
    {
        name: 'Review Employees',
        href: '/employees',
        icon: Users,
    }
];

export function QuickActions() {
    return (
        <div className="bg-white dark:bg-card rounded-[20px] border border-[rgba(162,161,168,0.1)] dark:border-border mt-6 p-6">
            <h4 className="text-[#16151C] dark:text-foreground font-semibold mb-4">Quick Actions</h4>
            <div className="space-y-3">
                {actions.map((action) => (
                    <Link
                        key={action.name}
                        to={action.href}
                        className="w-full px-4 py-3 bg-[rgba(113,82,243,0.05)] dark:bg-primary/10 text-[#7152F3] dark:text-primary rounded-[10px] hover:bg-[rgba(113,82,243,0.1)] dark:hover:bg-primary/20 transition-colors text-left flex items-center justify-between font-light"
                    >
                        <span>{action.name}</span>
                        <action.icon size={18} strokeWidth={1.5} />
                    </Link>
                ))}
            </div>
        </div>
    );
}
