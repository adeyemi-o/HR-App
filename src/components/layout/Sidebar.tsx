import { LayoutDashboard, Users, FileText, Briefcase, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Applicants', href: '/applicants', icon: Users },
    { name: 'Offers', href: '/offers', icon: FileText },
    { name: 'Employees', href: '/employees', icon: Briefcase },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const location = useLocation();

    return (
        <div className="w-[280px] bg-[rgba(162,161,168,0.05)] h-[calc(100vh-40px)] fixed left-5 top-5 bottom-5 flex flex-col rounded-[20px] border border-sidebar-border/10 backdrop-blur-xl">
            {/* Logo */}
            <div className="p-[30px]">
                <div className="flex items-center gap-2">
                    <img
                        src={logoDark}
                        alt="Prolific Homecare"
                        className="h-[40px] w-auto block dark:hidden"
                    />
                    <img
                        src={logoLight}
                        alt="Prolific Homecare"
                        className="h-[40px] w-auto hidden dark:block"
                    />
                </div>
            </div>

            {/* Navigation */}
            <nav className="px-[30px] flex-1">
                <ul className="space-y-[10px]">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <li key={item.name}>
                                <Link
                                    to={item.href}
                                    className={cn(
                                        'relative w-full flex items-center gap-4 px-5 py-[13px] rounded-r-[10px] transition-colors',
                                        isActive
                                            ? 'bg-[rgba(113,82,243,0.05)] text-[#7152F3]'
                                            : 'text-[#16151C] dark:text-gray-400 hover:bg-[rgba(113,82,243,0.02)]'
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#7152F3] rounded-r-[10px]" />
                                    )}
                                    <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                                    <span className={isActive ? 'font-semibold' : 'font-light'}>{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Mode Toggle */}
            <div className="p-[30px]">
                <ThemeToggle />
            </div>
        </div>
    );
}
