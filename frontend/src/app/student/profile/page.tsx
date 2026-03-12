"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function StudentProfile() {
    const [email, setEmail] = useState('student@gat.ac.in');

    useEffect(() => {
        const userEmail = sessionStorage.getItem('studentEmail') || sessionStorage.getItem('email');
        if (userEmail) setEmail(userEmail);
    }, []);

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
                <p className="text-slate-500 mt-1">View your account details used for certificate communication.</p>
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
                        <p className="text-slate-900 font-semibold" id="profile-email">{email}</p>
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
