"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type StudentProfilePayload = {
    user?: { email?: string; name?: string };
    studentProfile?: {
        usn?: string;
        branch?: string;
        yearOfPassing?: string;
        phoneNumber?: string;
    };
};

export default function StudentProfile() {
    const router = useRouter();
    const [profile, setProfile] = useState<StudentProfilePayload | null>(null);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (!token) {
            router.push('/student/login');
            return;
        }

        const loadProfile = async () => {
            try {
                const res = await apiFetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    return;
                }

                const data = await res.json().catch(() => null);
                setProfile(data);
            } catch {
                // Keep fallback UI when profile is temporarily unavailable.
            }
        };

        void loadProfile();
    }, [router]);

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
                <p className="text-slate-500 mt-1">View your account details used for certificate communication and applications.</p>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <User className="h-5 w-5 text-blue-500" />
                        Personal Info
                    </CardTitle>
                    <CardDescription>
                        This profile section is intentionally minimal for now to avoid non-working controls.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">Email Address</p>
                        <p className="text-slate-900 font-semibold" id="profile-email">{profile?.user?.email || 'Not available'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">Full Name</p>
                        <p className="text-slate-900 font-semibold">{profile?.user?.name || 'Not available'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">USN</p>
                        <p className="text-slate-900 font-semibold">{profile?.studentProfile?.usn || 'Not available'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">Branch</p>
                        <p className="text-slate-900 font-semibold">{profile?.studentProfile?.branch || 'Not available'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">Year of Passing</p>
                        <p className="text-slate-900 font-semibold">{profile?.studentProfile?.yearOfPassing || 'Not available'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">Phone Number</p>
                        <p className="text-slate-900 font-semibold">{profile?.studentProfile?.phoneNumber || 'Not available'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">Account Type</p>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Student Candidate
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
