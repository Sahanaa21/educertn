"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, User, ClipboardList, SearchCheck, Loader2 } from 'lucide-react';

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
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Services</h1>
                <p className="text-slate-500 mt-1">Choose the service you want to access.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/student/apply" className="block">
                    <Card className="h-full border-none shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Apply for Certificate
                            </CardTitle>
                            <CardDescription>Submit a new certificate request.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/student/requests" className="block">
                    <Card className="h-full border-none shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ClipboardList className="h-5 w-5 text-indigo-600" />
                                My Requests
                            </CardTitle>
                            <CardDescription>Track status and download issued certificates.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/student/academic-services" className="block">
                    <Card className="h-full border-none shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <SearchCheck className="h-5 w-5 text-emerald-600" />
                                Photocopy and Re-evaluation
                            </CardTitle>
                            <CardDescription>Apply for academic services when the window is open.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/student/profile" className="block">
                    <Card className="h-full border-none shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-5 w-5 text-slate-700" />
                                Student Profile
                            </CardTitle>
                            <CardDescription>View profile details used for requests.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
