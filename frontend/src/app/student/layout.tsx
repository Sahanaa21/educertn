"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Clock, LogOut, Menu, ChevronLeft, ChevronRight, Files } from 'lucide-react';
import { useEffect, useState } from 'react';

const menuItems = [
    { name: 'My Requests', href: '/student/requests', icon: Clock },
    { name: 'Apply Certificate', href: '/student/apply', icon: FileText },
    { name: 'Academic Services', href: '/student/academic-services', icon: Files },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        // start open on desktop, closed on mobile
        setIsSidebarOpen(window.innerWidth >= 768);
    }, []);

    // close on mobile when route changes
    useEffect(() => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    }, [pathname]);

    if (!mounted) return null;
    if (pathname === '/student/login') return <>{children}</>;

    return (
        <div className="flex min-h-[calc(100vh-176px)] flex-col">
            {/* Mobile-only top bar — in normal document flow, not fixed */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
                <span className="font-bold text-blue-900">Student Panel</span>
                <button
                    aria-label="Open navigation menu"
                    onClick={() => setIsSidebarOpen(true)}
                    className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            <div className="relative flex flex-1 overflow-hidden">
                {/* Dim overlay — only on mobile when sidebar open */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/*
                  Sidebar:
                  - Mobile: fixed overlay, slides in/out with translate
                  - Desktop (md:): static inline sidebar inside flex row
                */}
                <aside className={[
                    'flex flex-shrink-0 flex-col border-r bg-white transition-all duration-300',
                    'fixed inset-y-0 left-0 z-40 w-64',
                    'md:static md:inset-y-auto md:z-auto',
                    isSidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:translate-x-0 md:w-20',
                ].join(' ')}>
                    <div className="flex items-center justify-between border-b border-slate-200 p-4">
                        {isSidebarOpen ? (
                            <h2 className="flex items-center gap-2 text-lg font-bold text-blue-900">
                                <div className="h-2 w-2 min-w-[8px] rounded-full bg-blue-500" />
                                Student Panel
                            </h2>
                        ) : (
                            <div className="w-full flex justify-center">
                                <div className="h-3 w-3 rounded-full bg-blue-500" />
                            </div>
                        )}
                        {/* Close button on mobile */}
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 md:hidden"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        {/* Collapse button on desktop */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="hidden rounded-md p-1 text-slate-500 hover:bg-slate-100 md:flex"
                        >
                            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </button>
                    </div>

                    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    title={item.name}
                                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-700 shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                                    } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
                                    onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                                >
                                    <Icon size={20} className={isActive ? 'text-blue-700' : 'text-slate-400'} />
                                    {isSidebarOpen && <span className="truncate">{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="border-t border-slate-200 p-4">
                        <button
                            title="Logout"
                            onClick={() => {
                                sessionStorage.removeItem('token');
                                sessionStorage.removeItem('user');
                                router.push('/student/login');
                            }}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
                        >
                            <LogOut size={20} />
                            {isSidebarOpen && <span>Logout</span>}
                        </button>
                    </div>
                </aside>

                {/* Main content — always full width on mobile (sidebar is out of flow) */}
                <main className="min-w-0 flex-1 overflow-x-auto bg-slate-50 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
