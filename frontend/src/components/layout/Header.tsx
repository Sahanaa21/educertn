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
            <div className="container mx-auto flex items-center justify-between px-3 sm:px-6 lg:px-8 py-3 lg:py-4">
                {/* Logo and Title Section */}
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="relative h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                            <Image
                                src="/logo.png?v=20260310"
                                alt="Global Academy of Technology Logo"
                                fill
                                unoptimized
                                className="object-contain"
                                priority
                            />
                        </div>
                    </Link>

                    <div className="flex flex-col justify-center leading-tight">
                        <span className="text-sm sm:text-base lg:text-lg font-bold text-blue-950 uppercase tracking-tight lg:tracking-wide">Global Academy of Technology</span>
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-tight lg:tracking-wide">Certificate & Verification Portal</span>
                    </div>
                </div>

                {/* Desktop Navigation */}
                <nav className="ml-auto hidden lg:flex items-center gap-8 font-semibold text-sm">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="hover:text-yellow-500 transition-colors">
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Mobile Menu Button */}
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

            {/* Mobile Menu */}
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
