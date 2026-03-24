"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Users,
    Settings,
    LogOut,
    CheckSquare,
    ClipboardList
} from 'lucide-react';
import { useEffect, useState } from 'react';

const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Certificates', href: '/admin/certificates', icon: FileText },
    { name: 'Verifications', href: '/admin/verifications', icon: CheckSquare },
    { name: 'Academic Services', href: '/admin/academic-services', icon: ClipboardList },
    { name: 'Issues', href: '/admin/issues', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const clearAdminSession = () => {
            sessionStorage.removeItem('adminToken');
        };

        window.addEventListener('beforeunload', clearAdminSession);
        return () => window.removeEventListener('beforeunload', clearAdminSession);
    }, []);

    if (!mounted) return null;

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-[calc(100vh-176px)] flex-col">
            {/* Mobile-only top bar — in normal document flow */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white md:hidden">
                <span className="font-bold">Admin Hub</span>
                <button onClick={() => setIsSidebarOpen(true)}>
                    <Menu />
                </button>
            </div>

            <div className="relative flex flex-1 overflow-hidden">
                {/* Dim overlay — mobile only, when sidebar open */}
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setIsSidebarOpen(false)} />
                )}

                {/*
                  Sidebar:
                  - Mobile: fixed overlay, slides in/out with translate
                  - Desktop (md:): static inline sidebar, can collapse to icon-only
                */}
                <aside className={[
                    'flex shrink-0 flex-col border-r bg-slate-900 text-slate-300 transition-all duration-300',
                    // mobile: fixed overlay
                    'fixed inset-y-0 left-0 z-40 w-64',
                    // desktop: static inline with collapsible width
                    isSidebarOpen ? 'translate-x-0 md:static md:inset-y-auto md:z-auto md:w-64' : '-translate-x-full md:translate-x-0 md:static md:inset-y-auto md:z-auto md:w-20',
                ].join(' ')}>
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        {isSidebarOpen ? (
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 min-w-2"></div>
                                Admin Hub
                            </h2>
                        ) : (
                            <div className="hidden md:flex w-full justify-center">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                        )}
                        {/* Close on mobile */}
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 md:hidden"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        {/* Collapse toggle on desktop */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="hidden md:flex p-1 rounded-md hover:bg-slate-800 text-slate-400"
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
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                                        isActive ? 'bg-red-700 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'
                                    } ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
                                    onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                                >
                                    <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                                    <span className={`truncate ${!isSidebarOpen ? 'md:hidden' : ''}`}>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-800">
                        <button
                            title="Logout"
                            onClick={() => {
                                sessionStorage.removeItem('adminToken');
                                router.push('/admin/login');
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${!isSidebarOpen ? 'md:justify-center md:px-0' : ''}`}
                        >
                            <LogOut size={20} />
                            <span className={!isSidebarOpen ? 'md:hidden' : ''}>{`Logout`}</span>
                        </button>
                    </div>
                </aside>

                <main className="flex-1 min-w-0 p-4 md:p-8 bg-slate-50 overflow-x-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
