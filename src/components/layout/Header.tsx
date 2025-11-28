import { Bell, Search, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header() {
    return (
        <header className="bg-[#F9FAFB]/80 dark:bg-background/80 backdrop-blur-md h-[82px] fixed top-5 right-8 left-[340px] z-10 px-0 transition-all duration-200">
            <div className="h-full flex items-center justify-between">
                {/* Greeting */}
                <div>
                    <h1 className="text-[#16151C] dark:text-white text-[20px] font-semibold leading-[30px]">
                        Hello Robert 👋🏻
                    </h1>
                    <p className="text-[#A2A1A8] text-[14px] font-light leading-[22px]">Good Morning</p>
                </div>

                {/* Right Side - Search, Notification, Profile */}
                <div className="flex items-center gap-5">
                    {/* Search */}
                    <div className="relative">
                        <div className="flex items-center gap-3 px-4 py-[13px] border border-[rgba(162,161,168,0.1)] rounded-[10px] w-[261px] bg-white dark:bg-card">
                            <Search size={20} className="text-[#16151C] dark:text-gray-400" strokeWidth={1.5} />
                            <input
                                type="text"
                                placeholder="Search"
                                className="flex-1 bg-transparent text-[#16151C] dark:text-white text-sm font-light placeholder:text-[rgba(22,21,28,0.2)] dark:placeholder:text-gray-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Notification */}
                    <button className="bg-[rgba(162,161,168,0.1)] p-[13px] rounded-[10px] hover:bg-[rgba(162,161,168,0.15)] transition-colors relative bg-white dark:bg-card">
                        <Bell size={20} className="text-[#16151C] dark:text-gray-400" strokeWidth={1.5} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Profile */}
                    <div className="flex items-center gap-3 border border-[rgba(162,161,168,0.2)] rounded-[8px] px-[5px] py-[5px] pr-3 hover:border-[rgba(113,82,243,0.3)] transition-colors cursor-pointer bg-white dark:bg-card">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-[8px] flex items-center justify-center overflow-hidden">
                            <Avatar className="h-full w-full rounded-[8px]">
                                <AvatarImage src="https://github.com/shadcn.png" alt="Robert Allen" className="object-cover" />
                                <AvatarFallback>RA</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="hidden md:block">
                            <p className="text-[#16151C] dark:text-white text-sm font-semibold leading-[24px]">Robert Allen</p>
                            <p className="text-[#A2A1A8] text-xs font-light leading-[18px]">HR Manager</p>
                        </div>
                        <ChevronDown size={16} className="text-[#16151C] dark:text-gray-400 ml-1" strokeWidth={1.5} />
                    </div>
                </div>
            </div>
        </header>
    );
}
