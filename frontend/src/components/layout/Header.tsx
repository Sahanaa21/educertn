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
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 text-slate-800 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
            <div className="container mx-auto flex items-center justify-between px-3 sm:px-6 lg:px-8 py-3 lg:py-4">
                {/* Logo and Title Section */}
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="flex h-12 w-[5.8rem] items-center justify-center overflow-hidden sm:h-14 sm:w-[6.6rem] lg:h-16 lg:w-[7.4rem]">
                            <Image
                                src="/logo.png?v=20260414b"
                                alt="GATDEX Logo"
                                width={4096}
                                height={2769}
                                unoptimized
                                className="h-auto w-full object-contain"
                                priority
                            />
                        </div>
                    </Link>

                    <div className="flex flex-col justify-center leading-tight">
                        <span className="text-sm font-bold text-blue-950 uppercase tracking-tight sm:text-base lg:text-lg lg:tracking-wide">GATDEX</span>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">Certificate, Verification & Academic Services</span>
                    </div>
                </div>

                {/* Desktop Navigation */}
                <nav className="ml-auto hidden lg:flex items-center gap-8 font-semibold text-sm">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="hover:text-yellow-500 transition-colors">
                            {link.label}
                        </Link>
                    ))}
                    <div className="flex items-center gap-2">
                        <Link
                            href="/auth"
                            className="inline-flex items-center justify-center rounded-md border border-blue-900 px-4 py-2 text-blue-900 hover:bg-blue-50 transition-colors"
                        >
                            Login
                        </Link>
                        <Link
                            href="/auth?mode=signup"
                            className="inline-flex items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-white hover:bg-blue-800 transition-colors"
                        >
                            Sign Up
                        </Link>
                    </div>
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
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <Link
                                href="/auth"
                                className="rounded-md px-3 py-2 text-sm font-semibold border border-blue-900 text-blue-900 hover:bg-blue-50 text-center"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                href="/auth?mode=signup"
                                className="rounded-md px-3 py-2 text-sm font-semibold bg-blue-900 text-white hover:bg-blue-800 text-center"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </nav>
            )}
        </header>
    );
}
