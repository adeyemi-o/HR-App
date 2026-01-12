import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useState } from 'react';

export function MainLayout() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F9FAFB] dark:bg-background">
            <Sidebar />
            <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

            <div className="lg:ml-[340px] lg:mr-8 px-4 lg:px-0">
                <Header onOpenMobileNav={() => setMobileNavOpen(true)} />

                <main className="pt-[100px] lg:pt-[102px] min-h-screen pb-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
