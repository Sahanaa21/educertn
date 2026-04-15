"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, User, ClipboardList, SearchCheck, Loader2, ArrowRight } from 'lucide-react';

export default function StudentServicesHome() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        setMounted(true);
        const token = sessionStorage.getItem('token');
        
        if (!token) {
            // Redirect to login page if not authenticated
            router.replace('/auth');
            return;
        }
        
        setIsAuthenticated(true);
    }, [router]);

    if (!mounted || !isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Services</h1>
                <p className="mt-2 max-w-2xl text-slate-600">Use this dashboard to submit certificate requests, review application outcomes, and access academic service forms.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Link href="/student/apply" className="block">
                    <Card className="h-full border border-blue-100 bg-blue-50/40 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2 text-lg text-blue-900">
                                <span className="inline-flex items-center gap-2"><FileText className="h-5 w-5 text-blue-700" />Apply for Certificate</span>
                                <ArrowRight className="h-4 w-4 text-blue-700" />
                            </CardTitle>
                            <CardDescription className="text-slate-700">Create a fresh certificate request and proceed with payment securely.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/student/requests" className="block">
                    <Card className="h-full border border-indigo-100 bg-indigo-50/40 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2 text-lg text-indigo-900">
                                <span className="inline-flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-700" />My Requests</span>
                                <ArrowRight className="h-4 w-4 text-indigo-700" />
                            </CardTitle>
                            <CardDescription className="text-slate-700">Check current request outcomes and download soft copies when available.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/student/academic-services" className="block">
                    <Card className="h-full border border-emerald-100 bg-emerald-50/40 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2 text-lg text-emerald-900">
                                <span className="inline-flex items-center gap-2"><SearchCheck className="h-5 w-5 text-emerald-700" />Photocopy and Re-evaluation</span>
                                <ArrowRight className="h-4 w-4 text-emerald-700" />
                            </CardTitle>
                            <CardDescription className="text-slate-700">Submit academic service requests during the active service window.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/student/profile" className="block">
                    <Card className="h-full border border-slate-200 bg-slate-100/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2 text-lg text-slate-900">
                                <span className="inline-flex items-center gap-2"><User className="h-5 w-5 text-slate-700" />Student Profile</span>
                                <ArrowRight className="h-4 w-4 text-slate-700" />
                            </CardTitle>
                            <CardDescription className="text-slate-700">Review personal details used for certificate and service requests.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
