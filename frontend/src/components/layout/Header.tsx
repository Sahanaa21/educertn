"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/student', label: 'Student Services' },
    { href: '/company', label: 'Company Verification' },
    { href: '/report-issue', label: 'Report Issue' },
    { href: '#contact', label: 'Contact' },
];

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white text-slate-800 shadow-sm">
            <div className="container mx-auto flex h-18 items-center justify-between gap-3 px-3 sm:px-6 lg:h-24 lg:px-8">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <Link href="/" className="shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="relative h-12 w-36 sm:h-14 sm:w-44 lg:h-20 lg:w-72">
                            <Image
                                src="/logo.png?v=20260310"
                                alt="Global Academy of Technology Logo"
                                fill
                                unoptimized
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </Link>

                    <div className="hidden md:flex flex-col justify-center leading-tight whitespace-nowrap">
                        <span className="text-base font-bold text-blue-950 uppercase tracking-wide lg:text-xl">Global Academy of Technology</span>
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide lg:text-sm">Certificate & Verification Portal</span>
                    </div>
                </div>

                <nav className="ml-auto hidden lg:flex items-center gap-6 font-semibold text-sm">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="hover:text-yellow-500 transition-colors">
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-700 lg:hidden"
                    onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                    aria-label="Toggle navigation menu"
                    aria-expanded={isMobileMenuOpen}
                >
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {isMobileMenuOpen && (
                <nav className="border-t bg-white px-4 py-3 shadow-sm lg:hidden">
                    <div className="flex flex-col gap-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </nav>
            )}
        </header>
    );
}
