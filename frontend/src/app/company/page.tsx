"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, UploadCloud, Building2, CreditCard, ArrowLeft, FileText, CheckCircle, Clock, Menu, ChevronLeft, ChevronRight, LayoutDashboard, ClipboardList, FilePlus, LogOut } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch, API_BASE } from '@/lib/api';

type VerificationRequest = {
    id: string;
    requestId: string;
    companyName: string;
    studentName: string;
    usn: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    paymentStatus: string;
    createdAt: string;
};

const VERIFICATION_FEE = 5000;
const MAX_TEMPLATE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TEMPLATE_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

export default function CompanyVerification() {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [panelView, setPanelView] = useState<'dashboard' | 'requests' | 'application'>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    const [verificationTemplate, setVerificationTemplate] = useState<File | null>(null);

    // Dashboard States
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [mainLoading, setMainLoading] = useState(true);

    const handleUnauthorized = () => {
        localStorage.removeItem('companyToken');
        localStorage.removeItem('companyEmail');
        setIsAuthenticated(false);
        setStep(1);
        setPanelView('dashboard');
        setMainLoading(false);
        toast.error('Session expired. Please login again.');
        router.push('/company');
    };

    const fetchRequests = async (token: string) => {
        try {
            const res = await apiFetch('/api/company/verifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            } else if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
            }
        } catch (err) {
            console.error("Fetch requests failed", err);
        } finally {
            setMainLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('companyToken');
        const savedCompanyEmail = localStorage.getItem('companyEmail');
        if (token) {
            setIsAuthenticated(true);
            if (savedCompanyEmail) {
                setCompanyEmail(savedCompanyEmail);
            }
            fetchRequests(token);
        } else {
            setMainLoading(false);
        }
    }, []);

    useEffect(() => {
        if (pathname === '/company/requests') {
            setPanelView('requests');
            return;
        }
        if (pathname === '/company/apply') {
            setPanelView('application');
            return;
        }
        // Default /company route: show dashboard when requests exist, else show apply form.
        setPanelView(requests.length > 0 ? 'dashboard' : 'application');
    }, [pathname, requests.length]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail) return toast.error('Please enter your official email.');
        setLoading(true);

        try {
            const res = await apiFetch('/api/auth/company/login', {
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
            const res = await apiFetch('/api/auth/company/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, otp })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success('Login successful!');
                localStorage.setItem('companyToken', data.token);
                localStorage.setItem('companyEmail', loginEmail);
                setCompanyEmail(loginEmail); // Pre-fill
                setIsAuthenticated(true);
                fetchRequests(data.token);
                router.push('/company');
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
        if (!verificationTemplate) {
            return toast.error('Please upload the verification template file.');
        }

        const extension = verificationTemplate.name.split('.').pop()?.toLowerCase() || '';
        if (!ALLOWED_TEMPLATE_EXTENSIONS.includes(extension)) {
            return toast.error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG');
        }

        if (verificationTemplate.size > MAX_TEMPLATE_SIZE_BYTES) {
            return toast.error('File too large. Maximum allowed size is 10MB.');
        }

        if (phoneNumber && phoneNumber.length !== 10) {
            return toast.error('Phone number must be exactly 10 digits.');
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('companyToken');
            const effectiveEmail = companyEmail || localStorage.getItem('companyEmail') || '';

            if (!effectiveEmail) {
                setLoading(false);
                return toast.error('Unable to resolve company email. Please login again.');
            }

            const formData = new FormData();
            formData.append('companyName', companyName);
            formData.append('contactPerson', contactPerson);
            formData.append('companyEmail', effectiveEmail);
            formData.append('phone', phoneNumber);
            formData.append('studentName', studentName);
            formData.append('usn', usn);
            formData.append('verificationTemplate', verificationTemplate);

            const res = await apiFetch('/api/company/verifications', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                toast.success('Redirecting to secure payment gateway...');
                setTimeout(() => {
                    setLoading(false);
                    toast.success('Payment successful. Request Submitted!');
                    // Reset form and show dashboard
                    setStudentName('');
                    setUsn('');
                    setVerificationTemplate(null);

                    if (token) fetchRequests(token);
                    router.push('/company/requests');
                }, 2000);
            } else {
                if (res.status === 401 || res.status === 403) {
                    handleUnauthorized();
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                toast.error(data.message || 'Failed to submit verification request.');
                setLoading(false);
            }
        } catch (error) {
            toast.error('Network error. Failed to submit.');
            setLoading(false);
        }
    };

    const handleDownloadResponse = async (id: string, requestId: string) => {
        const token = localStorage.getItem('companyToken');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/company/verifications/${id}/response`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    handleUnauthorized();
                    return;
                }
                const data = await res.json();
                toast.error(data.message || 'Response file not available');
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${requestId}-completed-file`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Download failed');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('companyToken');
        localStorage.removeItem('companyEmail');
        setIsAuthenticated(false);
        setStep(1);
        router.push('/company');
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
        <div className="flex min-h-[calc(100vh-176px)] relative">
            <div className="md:hidden p-4 bg-white border-b border-slate-200 flex items-center justify-between w-full">
                <span className="font-bold text-yellow-700">Company Panel</span>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-600">
                    <Menu />
                </button>
            </div>

            <aside className={`transition-all duration-300 border-r bg-white z-40 absolute md:relative ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'} flex flex-col h-full min-h-screen md:min-h-0`}>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    {isSidebarOpen ? (
                        <h2 className="text-lg font-bold text-yellow-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 min-w-2"></div>
                            Company Panel
                        </h2>
                    ) : (
                        <div className="w-full flex justify-center">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="hidden md:flex p-1 rounded-md hover:bg-slate-100 text-slate-500"
                    >
                        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
                    <button
                        onClick={() => router.push('/company')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${panelView === 'dashboard' ? 'bg-yellow-50 text-yellow-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-yellow-700'} ${!isSidebarOpen && 'justify-center px-0'}`}
                    >
                        <LayoutDashboard size={20} className={panelView === 'dashboard' ? 'text-yellow-700' : 'text-slate-400'} />
                        {isSidebarOpen && <span className="truncate">Dashboard</span>}
                    </button>
                    <button
                        onClick={() => router.push('/company/requests')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${panelView === 'requests' ? 'bg-yellow-50 text-yellow-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-yellow-700'} ${!isSidebarOpen && 'justify-center px-0'}`}
                    >
                        <ClipboardList size={20} className={panelView === 'requests' ? 'text-yellow-700' : 'text-slate-400'} />
                        {isSidebarOpen && <span className="truncate">My Requests</span>}
                    </button>
                    <button
                        onClick={() => router.push('/company/apply')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${panelView === 'application' ? 'bg-yellow-50 text-yellow-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-yellow-700'} ${!isSidebarOpen && 'justify-center px-0'}`}
                    >
                        <FilePlus size={20} className={panelView === 'application' ? 'text-yellow-700' : 'text-slate-400'} />
                        {isSidebarOpen && <span className="truncate">New Application</span>}
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <button
                        title="Logout"
                        onClick={handleLogout}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${!isSidebarOpen && 'justify-center px-0'}`}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <main className={`flex-1 p-4 md:p-8 bg-slate-50 overflow-x-auto transition-all ${isSidebarOpen ? 'w-[calc(100vw-16rem)]' : 'w-full md:w-[calc(100vw-5rem)]'}`}>
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="inline-flex items-center justify-center p-3 bg-yellow-100 rounded-full">
                            <Building2 className="h-8 w-8 text-yellow-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Portal</h1>
                            <p className="text-slate-500 text-sm">Manage background verifications & academic records.</p>
                        </div>
                    </div>

                {panelView === 'dashboard' ? (
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
                                            <TableHead className="whitespace-nowrap">Student Name</TableHead>
                                            <TableHead className="whitespace-nowrap">USN</TableHead>
                                            <TableHead className="whitespace-nowrap">Status</TableHead>
                                            <TableHead className="whitespace-nowrap">Date</TableHead>
                                            <TableHead className="whitespace-nowrap">Download Response</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium text-blue-600 whitespace-nowrap">{req.requestId}</TableCell>
                                                <TableCell className="whitespace-nowrap font-medium">{req.studentName}</TableCell>
                                                <TableCell className="whitespace-nowrap text-slate-600">{req.usn}</TableCell>
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
                                                <TableCell className="whitespace-nowrap">
                                                    {req.status === 'COMPLETED' ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDownloadResponse(req.id, req.requestId)}
                                                        >
                                                            Download
                                                        </Button>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">Not available</span>
                                                    )}
                                                </TableCell>
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
                    panelView === 'requests' ? (
                        <Card className="overflow-hidden shadow-sm">
                            <CardHeader>
                                <CardTitle>All Verification Requests</CardTitle>
                                <CardDescription>Track all requests and download completed responses.</CardDescription>
                            </CardHeader>
                            <div className="overflow-x-auto w-full">
                                <Table>
                                    <TableHeader className="bg-slate-50 border-y">
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Request ID</TableHead>
                                            <TableHead className="whitespace-nowrap">Student Name</TableHead>
                                            <TableHead className="whitespace-nowrap">USN</TableHead>
                                            <TableHead className="whitespace-nowrap">Status</TableHead>
                                            <TableHead className="whitespace-nowrap">Date</TableHead>
                                            <TableHead className="whitespace-nowrap">Download Response</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium text-blue-600 whitespace-nowrap">{req.requestId}</TableCell>
                                                <TableCell className="whitespace-nowrap font-medium">{req.studentName}</TableCell>
                                                <TableCell className="whitespace-nowrap text-slate-600">{req.usn}</TableCell>
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
                                                <TableCell className="whitespace-nowrap">
                                                    {req.status === 'COMPLETED' ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDownloadResponse(req.id, req.requestId)}
                                                        >
                                                            Download
                                                        </Button>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">Not available</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {requests.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">No requests found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
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
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="9876543210"
                                            value={phoneNumber}
                                            inputMode="numeric"
                                            maxLength={10}
                                            pattern="[0-9]{10}"
                                            onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        />
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
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle>Verification Template Upload</CardTitle>
                                <CardDescription>Upload your company verification format file (PDF, DOC, DOCX, JPG, PNG up to 10MB).</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="template-upload">Upload Verification Template <span className="text-red-500">*</span></Label>
                                    <Label
                                        htmlFor="template-upload"
                                        className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                                    >
                                        <UploadCloud className="h-8 w-8 mb-2 text-yellow-600" />
                                        {verificationTemplate ? (
                                            <span className="text-sm font-medium text-slate-900 text-center">{verificationTemplate.name}</span>
                                        ) : (
                                            <span className="text-sm font-medium text-center">Click to upload company template</span>
                                        )}
                                        <span className="text-xs mt-1">Allowed: PDF, DOC, DOCX, JPG, PNG | Max 10MB</span>
                                        <input
                                            id="template-upload"
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            required
                                            onChange={(e) => {
                                                const selected = e.target.files?.[0] || null;
                                                setVerificationTemplate(selected);
                                            }}
                                        />
                                    </Label>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-100 border-t flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                                <div className="flex flex-col text-center sm:text-left">
                                    <span className="text-sm text-slate-500">Verification Fee</span>
                                    <span className="text-2xl font-bold text-slate-900">₹ {VERIFICATION_FEE.toFixed(2)}</span>
                                </div>
                                <Button type="submit" size="lg" className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold w-full sm:w-auto px-8" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                                    {loading ? 'Processing...' : 'Pay & Submit Request'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                    )
                )}
                </div>
            </main>
            </div>
    );
}
