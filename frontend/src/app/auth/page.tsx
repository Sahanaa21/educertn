"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BRANCHES = [
    { value: 'CSE', label: 'CSE - Computer Science and Engineering' },
    { value: 'ISE', label: 'ISE - Information Science and Engineering' },
    { value: 'ECE', label: 'ECE - Electronics and Communication Engineering' },
    { value: 'EEE', label: 'EEE - Electrical and Electronics Engineering' },
    { value: 'ME', label: 'ME - Mechanical Engineering' },
    { value: 'AIDS', label: 'AIDS - Artificial Intelligence and Data Science' },
    { value: 'AIML', label: 'AIML - Artificial Intelligence and Machine Learning' },
    { value: 'CSE(AIML)', label: 'CSE(AIML) - CSE with AI and ML' },
    { value: 'CIVIL', label: 'CIVIL - Civil Engineering' },
    { value: 'AERONAUTICAL', label: 'AERONAUTICAL - Aeronautical Engineering' },
];

type AuthMode = 'login' | 'signup';

type RegistrationRole = 'STUDENT' | 'COMPANY';

export default function AuthPage() {
    const router = useRouter();

    const [mode, setMode] = useState<AuthMode>('login');
    const [step, setStep] = useState<'email' | 'otp' | 'profile'>('email');
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [registrationToken, setRegistrationToken] = useState('');
    const [role, setRole] = useState<RegistrationRole>('STUDENT');

    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [usn, setUsn] = useState('');
    const [branch, setBranch] = useState('');
    const [yearOfPassing, setYearOfPassing] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [contactPerson, setContactPerson] = useState('');

    const title = useMemo(() => mode === 'login' ? 'Sign In' : 'Create Account', [mode]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const queryMode = new URLSearchParams(window.location.search).get('mode');

        if (queryMode === 'signup') {
            setMode('signup');
            return;
        }

        if (queryMode === 'login') {
            setMode('login');
        }
    }, []);

    const storeSessionAndRedirect = (data: any) => {
        const user = data?.user;
        const token = data?.token;
        const destination = data?.destination || '/';

        if (!token || !user?.role) {
            toast.error('Invalid login response. Please try again.');
            return;
        }

        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('companyToken');
        sessionStorage.removeItem('companyEmail');
        sessionStorage.removeItem('adminToken');

        if (user.role === 'ADMIN') {
            sessionStorage.setItem('adminToken', token);
        } else if (user.role === 'COMPANY') {
            sessionStorage.setItem('companyToken', token);
            sessionStorage.setItem('companyEmail', String(user.email || email).toLowerCase());
        } else {
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(user));
        }

        toast.success(data?.message || 'Login successful');
        router.push(destination);
    };

    const requestOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
            toast.error('Enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch('/api/auth/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), intent: mode })
            }, {
                timeoutMs: 45000,
                retries: 0,
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(data?.message || 'Unable to send OTP.');
                return;
            }

            toast.success('OTP sent successfully.');
            setStep('otp');
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setStep('otp');
                toast.message('Server is slow. OTP may still arrive. Enter OTP once received.');
            } else {
                toast.error('Network error. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!/^\d{6}$/.test(otp.trim())) {
            toast.error('OTP must be exactly 6 digits.');
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch('/api/auth/verify-unified-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() })
            }, {
                timeoutMs: 45000,
                retries: 0,
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(data?.message || 'OTP verification failed.');
                return;
            }

            if (data?.requiresRegistration) {
                setRegistrationToken(String(data.registrationToken || ''));
                if (data?.role === 'COMPANY') {
                    setRole('COMPANY');
                }
                if (data?.role === 'STUDENT') {
                    setRole('STUDENT');
                }
                setStep('profile');
                toast.message('OTP verified. Complete your profile to continue.');
                return;
            }

            storeSessionAndRedirect(data);
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const completeProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!registrationToken) {
            toast.error('Profile session expired. Please restart login/signup.');
            setStep('email');
            return;
        }

        if (name.trim().length < 3) {
            toast.error('Enter your full name.');
            return;
        }

        if (!/^\d{10}$/.test(phoneNumber.trim())) {
            toast.error('Phone number must be 10 digits.');
            return;
        }

        if (role === 'STUDENT') {
            if (!usn.trim() || usn.trim().length < 6) {
                toast.error('Enter a valid USN.');
                return;
            }
            if (!branch) {
                toast.error('Select your branch.');
                return;
            }
            if (!/^\d{4}$/.test(yearOfPassing.trim())) {
                toast.error('Enter a valid year of passing.');
                return;
            }
        }

        if (role === 'COMPANY') {
            if (companyName.trim().length < 2) {
                toast.error('Enter a valid company name.');
                return;
            }
            if (contactPerson.trim().length < 2) {
                toast.error('Enter a valid contact person name.');
                return;
            }
        }

        setLoading(true);
        try {
            const res = await apiFetch('/api/auth/complete-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registrationToken,
                    role,
                    name: name.trim(),
                    phoneNumber: phoneNumber.trim(),
                    usn: usn.trim().toUpperCase(),
                    branch,
                    yearOfPassing: yearOfPassing.trim(),
                    companyName: companyName.trim(),
                    contactPerson: contactPerson.trim(),
                })
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(data?.message || 'Unable to complete profile.');
                return;
            }

            storeSessionAndRedirect(data);
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16 flex flex-col items-center min-h-[70vh] bg-slate-50">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 self-center sm:self-auto max-w-xl w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Link>

            <Card className="w-full max-w-xl shadow-xl border-t-4 border-t-blue-700">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-2xl font-bold tracking-tight text-blue-900">{title}</CardTitle>
                    <CardDescription>
                        Use your email for OTP-based access. Admin access is restricted to authorized emails.
                    </CardDescription>
                </CardHeader>

                {step === 'email' && (
                    <form onSubmit={requestOtp}>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Action</Label>
                                <div className="grid grid-cols-2 rounded-lg border bg-slate-50 p-1">
                                    <button
                                        type="button"
                                        className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        onClick={() => setMode('login')}
                                    >
                                        Login
                                    </button>
                                    <button
                                        type="button"
                                        className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        onClick={() => setMode('signup')}
                                    >
                                        Sign Up
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="pb-8">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Send OTP'}
                            </Button>
                        </CardFooter>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={verifyOtp}>
                        <CardContent className="space-y-4 pt-4">
                            <p className="text-sm text-slate-600 text-center">OTP sent to <span className="font-semibold">{email}</span></p>
                            <div className="space-y-2">
                                <Label htmlFor="otp">OTP</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    placeholder="123456"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength={6}
                                    required
                                    className="text-center text-2xl tracking-widest font-mono"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="pb-8 flex flex-col gap-3">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Verify OTP'}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setStep('email')} disabled={loading}>
                                Change Email
                            </Button>
                        </CardFooter>
                    </form>
                )}

                {step === 'profile' && (
                    <form onSubmit={completeProfile}>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select value={role} onValueChange={(value) => setRole((value || 'STUDENT') as RegistrationRole)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STUDENT">Student</SelectItem>
                                        <SelectItem value="COMPANY">Company</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input
                                    id="phoneNumber"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    maxLength={10}
                                    required
                                />
                            </div>

                            {role === 'STUDENT' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="usn">USN</Label>
                                        <Input id="usn" value={usn} onChange={(e) => setUsn(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="branch">Branch</Label>
                                        <Select value={branch} onValueChange={(value) => setBranch(value || '')}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select branch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BRANCHES.map((branchItem) => (
                                                    <SelectItem key={branchItem.value} value={branchItem.value}>{branchItem.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="yearOfPassing">Year of Passing</Label>
                                        <Input
                                            id="yearOfPassing"
                                            value={yearOfPassing}
                                            onChange={(e) => setYearOfPassing(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            maxLength={4}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {role === 'COMPANY' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName">Company Name</Label>
                                        <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contactPerson">Contact Person</Label>
                                        <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required />
                                    </div>
                                </>
                            )}
                        </CardContent>
                        <CardFooter className="pb-8">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Complete Registration'}
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
}
