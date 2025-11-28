import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
    return (
        <div className="min-h-screen bg-[#F9FAFB] dark:bg-background">
            <Sidebar />

            <div className="ml-[340px] mr-8">
                <Header />

                <main className="pt-[102px] min-h-screen pb-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
