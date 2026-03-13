"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) return toast.error('Enter your admin email and password.');
        if (!EMAIL_REGEX.test(email.trim())) return toast.error('Enter a valid admin email address.');
        setLoading(true);

        try {
            const res = await apiFetch('/api/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password })
            });

            const raw = await res.text();
            let data: any = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch {
                data = null;
            }

            if (res.ok) {
                toast.success('Admin Login successful!');
                sessionStorage.setItem('adminToken', data.token);
                router.push('/admin');
            } else {
                if (res.status === 400 || res.status === 401) {
                    toast.error(data?.message || 'Invalid email or password.');
                } else {
                    toast.error(data?.message || 'Login failed. Please try again.');
                }
            }
        } catch (error) {
            toast.error('Network error. Failed to login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16 flex flex-col items-center min-h-[70vh] justify-center bg-slate-50">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 self-center sm:self-auto max-w-sm w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Link>

            <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-red-700">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                        <Lock className="h-6 w-6 text-red-700" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Admin Login</CardTitle>
                    <CardDescription>Authorized university staff only.</CardDescription>
                </CardHeader>

                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@gat.ac.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="pb-8">
                        <Button type="submit" className="w-full bg-red-700 hover:bg-red-800 text-white" disabled={loading}>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Sign In'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
