"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export default function StudentLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return toast.error('Please enter your email.');
        setLoading(true);

        try {
            const res = await apiFetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(`OTP sent to ${email}`);
                setStep(2);
            } else {
                toast.error(data.message || 'Failed to send OTP.');
            }
        } catch (error) {
            toast.error('Network error. Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) return toast.error('Please enter the OTP.');
        setLoading(true);

        try {
            const res = await apiFetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Login successful!');
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                router.push('/student');
            } else {
                toast.error(data.message || 'Invalid OTP. Try again.');
            }
        } catch (error) {
            toast.error('Network error. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16 flex flex-col items-center min-h-[70vh]">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 self-center sm:self-auto max-w-md w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Link>

            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-2xl font-bold tracking-tight text-blue-900">Student Portal</CardTitle>
                    <CardDescription>Sign in to request certificates and view history.</CardDescription>
                </CardHeader>

                {step === 1 ? (
                    <form onSubmit={handleSendOtp}>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700">Student Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name.usn@gat.ac.in"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12"
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 pb-8">
                            <Button type="submit" className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white text-base" disabled={loading}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Send OTP'}
                            </Button>
                        </CardFooter>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2 text-center text-sm text-slate-600 mb-6">
                                <p>We've sent a one-time password to</p>
                                <p className="font-semibold text-slate-900">{email}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="otp" className="text-slate-700">Enter OTP</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    placeholder="123456"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="h-12 text-center text-2xl tracking-widest font-mono"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 pb-8">
                            <Button type="submit" className="w-full h-12 bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-bold text-base" disabled={loading}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Verify & Login'}
                            </Button>
                            <Button type="button" variant="ghost" className="text-sm text-slate-500" onClick={() => setStep(1)} disabled={loading}>
                                Wrong email? Click here
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
}
