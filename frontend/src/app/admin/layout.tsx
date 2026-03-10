"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Building2,
    Users,
    CreditCard,
    BarChart3,
    Settings,
    LogOut,
    CheckSquare
} from 'lucide-react';
import { useEffect, useState } from 'react';

const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Certificates', href: '/admin/certificates', icon: FileText },
    { name: 'Verifications', href: '/admin/verifications', icon: CheckSquare },
    { name: 'Issues', href: '/admin/issues', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
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

    if (!mounted) return null;

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-[calc(100vh-176px)] relative">
            {/* Mobile Sidebar Toggle Header (visible only when sidebar is hidden on small screens) */}
            <div className="md:hidden p-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
                <span className="font-bold">Admin Hub</span>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <Menu />
                </button>
            </div>

            <aside className={`transition-all duration-300 border-r bg-slate-900 text-slate-300 absolute md:relative z-40 ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'} flex flex-col h-full min-h-screen md:min-h-0`}>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    {isSidebarOpen ? (
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 min-w-2"></div>
                            Admin Hub
                        </h2>
                    ) : (
                        <div className="w-full flex justify-center">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                    )}
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
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-red-700 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'
                                    } ${!isSidebarOpen && 'justify-center px-0'}`}
                            >
                                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                                {isSidebarOpen && <span className="truncate">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        title="Logout"
                        onClick={() => {
                            localStorage.removeItem('adminToken');
                            router.push('/admin/login');
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${!isSidebarOpen && 'justify-center px-0'}`}
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
            )}

            <main className={`flex-1 p-4 md:p-8 bg-slate-50 overflow-x-auto transition-all ${isSidebarOpen ? 'w-[calc(100vw-16rem)]' : 'w-full md:w-[calc(100vw-5rem)]'}`}>
                {children}
            </main>
        </div>
    );
}
