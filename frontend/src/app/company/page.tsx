"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, UploadCloud, Building2, CreditCard, ArrowLeft, FileText, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CompanyVerification() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'dashboard' | 'form'>('dashboard');

    // Auth States
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);

    // Form States
    const [companyName, setCompanyName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [studentName, setStudentName] = useState('');
    const [usn, setUsn] = useState('');
    const [branch, setBranch] = useState('');
    const [yearOfPassing, setYearOfPassing] = useState('');
    const [verificationType, setVerificationType] = useState('');

    // Dashboard States
    const [requests, setRequests] = useState<any[]>([]);
    const [mainLoading, setMainLoading] = useState(true);

    const fetchRequests = async (token: string) => {
        try {
            const res = await fetch('http://localhost:5000/api/company/verifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
                setView(data.length > 0 ? 'dashboard' : 'form');
            } else {
                setView('form');
            }
        } catch (err) {
            console.error("Fetch requests failed", err);
            setView('form');
        } finally {
            setMainLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('companyToken');
        if (token) {
            setIsAuthenticated(true);
            fetchRequests(token);
        } else {
            setMainLoading(false);
        }
    }, []);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail) return toast.error('Please enter your official email.');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:5000/api/auth/company/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail })
            });

            if (res.ok) {
                toast.success(`OTP sent to ${loginEmail}`);
                setStep(2);
            } else {
                toast.error('Failed to send OTP.');
            }
        } catch (error) {
            toast.error('Network error.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) return toast.error('Please enter the OTP.');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:5000/api/auth/company/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, otp })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Login successful!');
                localStorage.setItem('companyToken', data.token);
                setCompanyEmail(loginEmail); // Pre-fill
                setIsAuthenticated(true);
                fetchRequests(data.token);
            } else {
                toast.error(data.message || 'Invalid OTP.');
            }
        } catch (error) {
            toast.error('Network error.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('companyToken');
            const res = await fetch('http://localhost:5000/api/company/verifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    companyName,
                    contactPerson,
                    companyEmail,
                    phoneNumber,
                    studentName,
                    usn,
                    branch,
                    yearOfPassing,
                    verificationType,
                    amount: 1500
                })
            });

            if (res.ok) {
                toast.success('Redirecting to secure payment gateway...');
                setTimeout(() => {
                    setLoading(false);
                    toast.success('Payment successful. Request Submitted!');
                    // Reset form and show dashboard
                    setStudentName('');
                    setUsn('');
                    setBranch('');
                    setYearOfPassing('');
                    setVerificationType('');

                    if (token) fetchRequests(token);
                }, 2000);
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to submit verification request.');
                setLoading(false);
            }
        } catch (error) {
            toast.error('Network error. Failed to submit.');
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('companyToken');
        setIsAuthenticated(false);
        setStep(1);
    };

    if (mainLoading) {
        return <div className="p-8 text-center text-slate-500 min-h-[70vh] flex items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-16 flex flex-col items-center min-h-[70vh]">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 self-center sm:self-auto max-w-md w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                </Link>

                <Card className="w-full max-w-md shadow-xl border-t-4 border-t-yellow-500">
                    <CardHeader className="text-center space-y-2">
                        <CardTitle className="text-2xl font-bold tracking-tight text-blue-900">Agency / Company Login</CardTitle>
                        <CardDescription>Sign in with your official email to request verifications.</CardDescription>
                    </CardHeader>

                    {step === 1 ? (
                        <form onSubmit={handleSendOtp}>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="loginEmail" className="text-slate-700">Official Email</Label>
                                    <Input
                                        id="loginEmail"
                                        type="email"
                                        placeholder="hr@company.com"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
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
                                    <p className="font-semibold text-slate-900">{loginEmail}</p>
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

    return (
        <div className="bg-slate-50 py-12 min-h-[80vh]">
            <div className="max-w-5xl mx-auto px-4 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="inline-flex items-center justify-center p-3 bg-yellow-100 rounded-full">
                            <Building2 className="h-8 w-8 text-yellow-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Portal</h1>
                            <p className="text-slate-500 text-sm">Manage background verifications & academic records.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {view === 'form' && requests.length > 0 && (
                            <Button variant="outline" onClick={() => setView('dashboard')}>View Dashboard</Button>
                        )}
                        {view === 'dashboard' && (
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setView('form')}>New Verification Request</Button>
                        )}
                        <Button variant="ghost" className="text-slate-500" onClick={handleLogout}>Logout</Button>
                    </div>
                </div>

                {view === 'dashboard' ? (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="border-t-4 border-t-yellow-500 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-600">Total Requests</CardTitle>
                                    <FileText className="h-4 w-4 text-yellow-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-slate-900">{requests.length}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-t-4 border-t-green-500 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-600">Verified</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-slate-900">{requests.filter(r => r.status === 'COMPLETED').length}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-t-4 border-t-blue-500 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-600">In Progress</CardTitle>
                                    <Clock className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-slate-900">{requests.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING').length}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="overflow-hidden shadow-sm">
                            <CardHeader>
                                <CardTitle>Recent Verifications</CardTitle>
                            </CardHeader>
                            <div className="overflow-x-auto w-full">
                                <Table>
                                    <TableHeader className="bg-slate-50 border-y">
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Request ID</TableHead>
                                            <TableHead className="whitespace-nowrap">Candidate Name</TableHead>
                                            <TableHead className="whitespace-nowrap">USN</TableHead>
                                            <TableHead className="whitespace-nowrap">Type</TableHead>
                                            <TableHead className="whitespace-nowrap">Status</TableHead>
                                            <TableHead className="whitespace-nowrap">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium text-blue-600 whitespace-nowrap">{req.id}</TableCell>
                                                <TableCell className="whitespace-nowrap font-medium">{req.studentName}</TableCell>
                                                <TableCell className="whitespace-nowrap text-slate-600">{req.usn}</TableCell>
                                                <TableCell className="whitespace-nowrap">{req.verificationType.replace('_', ' ').toUpperCase()}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <Badge variant="outline" className={
                                                        req.status === 'COMPLETED' ? 'border-green-500 text-green-700 bg-green-50' :
                                                            req.status === 'PROCESSING' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                                                req.status === 'REJECTED' ? 'border-red-500 text-red-700 bg-red-50' :
                                                                    'border-yellow-500 text-yellow-700 bg-yellow-50'
                                                    }>
                                                        {req.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))}
                                        {requests.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                                    No verification requests found. Click "New Verification Request" to begin.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
                        <Card className="shadow-md border-t-4 border-t-yellow-500">
                            <CardHeader>
                                <CardTitle>Agency / Company Details</CardTitle>
                                <CardDescription>Details of the organization requesting the verification.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
                                        <Input id="companyName" placeholder="Tech Corp Inc." value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contactPerson">Contact Person <span className="text-red-500">*</span></Label>
                                        <Input id="contactPerson" placeholder="Jane Doe" value={contactPerson} onChange={e => setContactPerson(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="companyEmail">Official Email ID <span className="text-red-500">*</span></Label>
                                        <Input id="companyEmail" type="email" placeholder="hr@techcorp.com" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" type="tel" placeholder="+91 9876543210" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle>Student Details</CardTitle>
                                <CardDescription>Details of the candidate being verified.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="studentName">Candidate Name <span className="text-red-500">*</span></Label>
                                        <Input id="studentName" placeholder="John Smith" value={studentName} onChange={e => setStudentName(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="usn">Candidate USN <span className="text-red-500">*</span></Label>
                                        <Input id="usn" placeholder="1GA..." value={usn} onChange={e => setUsn(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="branch">Branch</Label>
                                        <Select onValueChange={(val: any) => setBranch(val)} required>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Branch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CSE">Computer Science & Engineering</SelectItem>
                                                <SelectItem value="ISE">Information Science</SelectItem>
                                                <SelectItem value="ECE">Electronics & Communication</SelectItem>
                                                <SelectItem value="EEE">Electrical & Electronics</SelectItem>
                                                <SelectItem value="ME">Mechanical Engineering</SelectItem>
                                                <SelectItem value="CE">Civil Engineering</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="year">Year of Passing</Label>
                                        <Input id="year" type="number" placeholder="2023" value={yearOfPassing} onChange={e => setYearOfPassing(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="verificationType">Verification Type <span className="text-red-500">*</span></Label>
                                        <Select onValueChange={(val: any) => setVerificationType(val)} required>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Verification Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="degree">Degree Verification</SelectItem>
                                                <SelectItem value="marks">Marks Verification</SelectItem>
                                                <SelectItem value="enrollment">Enrollment Verification</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle>Mandatory Documents</CardTitle>
                                <CardDescription>Upload necessary authorization files.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Agency Authorization Letter <span className="text-red-500">*</span></Label>
                                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer bg-white">
                                            <UploadCloud className="h-8 w-8 mb-2 text-yellow-600" />
                                            <span className="text-sm font-medium text-center">Upload Official Letter</span>
                                            <span className="text-xs mt-1">PDF only (Max 5MB)</span>
                                            <input type="file" className="hidden" accept=".pdf" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Student Consent Letter <span className="text-red-500">*</span></Label>
                                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer bg-white">
                                            <UploadCloud className="h-8 w-8 mb-2 text-yellow-600" />
                                            <span className="text-sm font-medium text-center">Upload Signed Consent</span>
                                            <span className="text-xs mt-1">PDF or Image (Max 5MB)</span>
                                            <input type="file" className="hidden" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-100 border-t flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                                <div className="flex flex-col text-center sm:text-left">
                                    <span className="text-sm text-slate-500">Verification Fee</span>
                                    <span className="text-2xl font-bold text-slate-900">₹ 1500.00 <span className="text-sm font-normal text-slate-500">+ GST</span></span>
                                </div>
                                <Button type="submit" size="lg" className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold w-full sm:w-auto px-8" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                                    {loading ? 'Processing...' : 'Pay & Submit Request'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                )}
            </div>
        </div>
    );
}
