"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bug, Loader2, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

const CATEGORY_OPTIONS = [
    'Payment',
    'Certificate Request',
    'Verification Request',
    'Login / OTP',
    'UI / Display',
    'Performance',
    'Other'
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ReportIssuePage() {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');

    const pageUrl = useMemo(() => {
        if (typeof window === 'undefined') return '/report-issue';
        return window.location.pathname;
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();
        const trimmedCategory = category.trim();
        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedRole = role.trim();

        if (!trimmedTitle || !trimmedDescription || !trimmedCategory) {
            toast.error('Please complete title, category and issue details.');
            return;
        }

        if (trimmedTitle.length < 5 || trimmedDescription.length < 15) {
            toast.error('Please provide a little more detail for faster resolution.');
            return;
        }

        if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
            toast.error('Enter a valid email address or leave it empty.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: trimmedTitle,
                description: trimmedDescription,
                category: trimmedCategory,
                pageUrl,
                reportedByName: trimmedName,
                reportedByEmail: trimmedEmail,
                role: trimmedRole,
                deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : ''
            };

            const res = await apiFetch('/api/support/issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const raw = await res.text();
            let data: any = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch {
                data = null;
            }

            if (!res.ok) {
                toast.error(data?.message || 'Failed to submit issue report.');
                return;
            }

            toast.success('Issue submitted successfully. Our team will review it soon.');
            setTitle('');
            setDescription('');
            setCategory('');
            setName('');
            setEmail('');
            setRole('');
        } catch {
            toast.error('Network error while submitting report.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-10 sm:px-8">
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="rounded-lg bg-slate-900 p-5 text-white">
                    <div className="flex items-center gap-3">
                        <Bug className="h-6 w-6 text-yellow-400" />
                        <h1 className="text-2xl font-bold tracking-tight">Report an Issue</h1>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                        Found a bug or problem? Share it here. This helps us keep the GAT portal smooth and reliable.
                    </p>
                </div>

                <Card className="border border-slate-200 shadow-md">
                    <form onSubmit={handleSubmit}>
                        <CardHeader>
                            <CardTitle>Issue Details</CardTitle>
                            <CardDescription>
                                Add clear steps and expected behavior so the admin team can fix issues faster.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="issueTitle">Title <span className="text-red-500">*</span></Label>
                                <Input
                                    id="issueTitle"
                                    placeholder="Example: Payment page keeps loading after submit"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Category <span className="text-red-500">*</span></Label>
                                    <Select value={category} onValueChange={(value) => setCategory(String(value ?? ''))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORY_OPTIONS.map((option) => (
                                                <SelectItem key={option} value={option}>{option}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role (optional)</Label>
                                    <Input
                                        id="role"
                                        placeholder="Student / Company / Admin / Visitor"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="issueDescription">What happened? <span className="text-red-500">*</span></Label>
                                <Textarea
                                    id="issueDescription"
                                    className="min-h-32"
                                    placeholder="Write steps to reproduce, what you expected, and what actually happened..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Your Name (optional)</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email (optional)</Label>
                                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3 border-t bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                                We collect this report only for support and quality improvement.
                            </div>
                            <Button type="submit" disabled={loading} className="bg-blue-700 hover:bg-blue-800 text-white">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {loading ? 'Submitting...' : 'Submit Report'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
