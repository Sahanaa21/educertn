"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Clock, Settings, LogOut, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

const menuItems = [
    { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { name: 'Apply Certificate', href: '/student/apply', icon: FileText },
    { name: 'My Requests', href: '/student/requests', icon: Clock },
    { name: 'Profile Settings', href: '/student/profile', icon: Settings },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            setIsSidebarOpen(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, [pathname]);

    if (!mounted) return null;

    if (pathname === '/student/login') {
        return <>{children}</>;
    }

    return (
        <div className="relative flex min-h-[calc(100vh-176px)] w-full overflow-x-clip">
            {/* Mobile Sidebar Toggle Header */}
            <div className="fixed left-0 right-0 top-[72px] z-20 border-b border-slate-200 bg-white p-4 md:hidden">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">Student Panel</span>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-600">
                        <Menu />
                    </button>
                </div>
            </div>

            <aside className={`fixed inset-y-0 left-0 z-40 flex h-full min-h-screen w-64 flex-col border-r bg-white pt-[72px] transition-transform duration-300 md:static md:min-h-0 md:pt-0 ${isSidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:translate-x-0 md:w-20'}`}>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    {isSidebarOpen ? (
                        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 min-w-[8px]"></div>
                            Student Panel
                        </h2>
                    ) : (
                        <div className="w-full flex justify-center">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="hidden md:flex p-1 rounded-md hover:bg-slate-100 text-slate-500"
                    >
                        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={item.name}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                                    } ${!isSidebarOpen && 'justify-center px-0'}`}
                            >
                                <Icon size={20} className={isActive ? 'text-blue-700' : 'text-slate-400'} />
                                {isSidebarOpen && <span className="truncate">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <button
                        title="Logout"
                        onClick={() => {
                            localStorage.removeItem('token');
                            router.push('/student/login');
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${!isSidebarOpen && 'justify-center px-0'}`}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile when sidebar is open */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}"w-full flex-1 overflow-x-auto bg-slate-50 p-4 pt-20 transition-all md:p-8 md:pt-8"

            <main className={`flex-1 p-4 md:p-8 bg-slate-50 overflow-x-auto transition-all ${isSidebarOpen ? 'w-[calc(100vw-16rem)]' : 'w-full md:w-[calc(100vw-5rem)]'}`}>
                {children}
            </main>
        </div>
    );
}
