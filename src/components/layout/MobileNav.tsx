import { SlideOver } from '@/components/ui/SlideOver';
import { SidebarContent } from '@/components/layout/Sidebar';
import { useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useEffect, useState } from 'react';
import { settingsService } from '@/services/settingsService';
import { LayoutDashboard, Users, FileText, Briefcase, Settings, Sparkles } from 'lucide-react';
import defaultLogoLight from '@/assets/logo-light.png';
import defaultLogoDark from '@/assets/logo-dark.png';

// Duplicate navigation structure as it's not exported from Sidebar.tsx 
// (Alternatively, export it from Sidebar.tsx, but duplication avoids circular deps if structured poorly)
// Ideally, this should be in a centralized config, but for now, we'll keep it consistent.
const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Applicants', href: '/applicants', icon: Users },
    { name: 'Offers', href: '/offers', icon: FileText },
    { name: 'Employees', href: '/employees', icon: Briefcase },
    { name: 'AI Dashboard', href: '/admin/ai-dashboard', icon: Sparkles, adminOnly: true },
    { name: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
    const location = useLocation();
    const { isAdmin } = useUserRole();
    const [logoForLightMode, setLogoForLightMode] = useState(defaultLogoDark);
    const [logoForDarkMode, setLogoForDarkMode] = useState(defaultLogoLight);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await settingsService.getSettings();
                if (settings['logo_light']) setLogoForLightMode(settings['logo_light']);
                if (settings['logo_dark']) setLogoForDarkMode(settings['logo_dark']);
            } catch (error) {
                console.error('Failed to load logo settings', error);
            }
        };
        loadSettings();
    }, []);

    const filteredNavigation = navigation.filter(item => !item.adminOnly || isAdmin);

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title="Menu"
            side="left"
            width="md"
        >
            <div className="h-full flex flex-col -m-6">
                {/* Check margin adjustment based on SlideOver padding */}
                <SidebarContent
                    logoLight={logoForLightMode}
                    logoDark={logoForDarkMode}
                    navigation={filteredNavigation}
                    currentPath={location.pathname}
                    className="flex h-full w-full relative left-0 top-0 bottom-0 rounded-none border-none bg-transparent"
                    onNavigate={onClose}
                />
            </div>
        </SlideOver>
    );
}
