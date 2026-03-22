"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, UploadCloud, Building2, CreditCard, ArrowLeft, FileText, CheckCircle, Clock, Menu, ChevronLeft, ChevronRight, LayoutDashboard, ClipboardList, FilePlus, LogOut, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch, API_BASE } from '@/lib/api';
import { openRazorpayCheckout } from '@/lib/razorpay';

type VerificationRequest = {
    id: string;
    requestId: string;
    companyName: string;
    studentName: string;
    usn: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    rejectionReason?: string | null;
    paymentStatus: string;
    createdAt: string;
};

const VERIFICATION_FEE = 5000;
const MAX_TEMPLATE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TEMPLATE_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CompanyVerification() {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [panelView, setPanelView] = useState<'dashboard' | 'requests' | 'application'>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    const [requestSearch, setRequestSearch] = useState('');
    const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');
    const [requestSortBy, setRequestSortBy] = useState('NEWEST');

    // Dashboard States
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [mainLoading, setMainLoading] = useState(true);
    const [payingRequestId, setPayingRequestId] = useState<string | null>(null);
    const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

    const handleUnauthorized = () => {
        sessionStorage.removeItem('companyToken');
        sessionStorage.removeItem('companyEmail');
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
                cache: 'no-store',
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
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            setIsSidebarOpen(true);
        }

        const token = sessionStorage.getItem('companyToken');
        const savedCompanyEmail = sessionStorage.getItem('companyEmail');
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
        } else if (pathname === '/company/apply') {
            setPanelView('application');
        } else {
            // Default /company route: show dashboard when requests exist, else show apply form.
            setPanelView(requests.length > 0 ? 'dashboard' : 'application');
        }

        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, [pathname, requests.length]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail.trim()) return toast.error('Please enter your official email.');
        if (!EMAIL_REGEX.test(loginEmail.trim())) return toast.error('Enter a valid company email address.');
        setLoading(true);

        try {
            const res = await apiFetch('/api/auth/company/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail.trim().toLowerCase() })
            }, {
                timeoutMs: 25000,
                retries: 0,
            });
            let data: any = null;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (res.ok) {
                toast.success(`OTP sent to ${loginEmail}`);
                setStep(2);
            } else {
                toast.error(data?.message || 'Failed to send OTP.');
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setStep(2);
                toast.message('Server is slow, but OTP may still arrive. Enter OTP once received.');
            } else {
                toast.error('Network error.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) return toast.error('Please enter the OTP.');
        if (!/^\d{6}$/.test(otp.trim())) return toast.error('OTP must be exactly 6 digits.');
        setLoading(true);

        try {
            const res = await apiFetch('/api/auth/company/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), otp: otp.trim() })
            }, {
                timeoutMs: 45000,
                retries: 0,
            });
            const raw = await res.text();
            let data: any = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch {
                data = null;
            }

            if (res.ok) {
                toast.success('Login successful!');
                sessionStorage.setItem('companyToken', data.token);
                sessionStorage.setItem('companyEmail', loginEmail.trim().toLowerCase());
                setCompanyEmail(loginEmail.trim().toLowerCase());
                setIsAuthenticated(true);
                fetchRequests(data.token);
                router.push('/company');
            } else {
                if (res.status === 400 || res.status === 401) {
                    toast.error(data?.message || 'Invalid OTP or email. Please try again.');
                } else {
                    toast.error(data?.message || 'Failed to verify OTP.');
                }
            }
        } catch (error) {
            toast.error('Network error.');
        } finally {
            setLoading(false);
        }
    };

    const validateVerificationForm = () => {
        if (!companyName.trim() || !contactPerson.trim() || !studentName.trim() || !usn.trim()) {
            toast.error('Please fill all required fields.');
            return false;
        }

        if (companyName.trim().length < 2 || contactPerson.trim().length < 2 || studentName.trim().length < 2) {
            toast.error('Enter valid names for company, contact person, and candidate.');
            return false;
        }

        if (!/^[A-Za-z0-9]{6,20}$/.test(usn.trim())) {
            toast.error('Enter a valid candidate USN.');
            return false;
        }

        if (!verificationTemplate) {
            toast.error('Please upload the verification template file.');
            return false;
        }

        const extension = verificationTemplate.name.split('.').pop()?.toLowerCase() || '';
        if (!ALLOWED_TEMPLATE_EXTENSIONS.includes(extension)) {
            toast.error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG.');
            return false;
        }

        if (verificationTemplate.size > MAX_TEMPLATE_SIZE_BYTES) {
            toast.error('File too large. Maximum allowed size is 10MB.');
            return false;
        }

        if (phoneNumber && phoneNumber.length !== 10) {
            toast.error('Phone number must be exactly 10 digits.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e?: React.FormEvent): Promise<void> => {
        if (e) e.preventDefault();
        if (!validateVerificationForm()) return;

        setLoading(true);

        try {
            const token = sessionStorage.getItem('companyToken');
            const effectiveEmail = companyEmail || sessionStorage.getItem('companyEmail') || '';
            const templateFile = verificationTemplate;

            if (!effectiveEmail) {
                setLoading(false);
                toast.error('Unable to resolve company email. Please login again.');
                return;
            }

            if (!templateFile) {
                setLoading(false);
                toast.error('Please upload the verification template file.');
                return;
            }

            const formData = new FormData();
            formData.append('companyName', companyName);
            formData.append('contactPerson', contactPerson);
            formData.append('companyEmail', effectiveEmail);
            formData.append('phone', phoneNumber);
            formData.append('studentName', studentName);
            formData.append('usn', usn);
            formData.append('verificationTemplate', templateFile);

            const res = await apiFetch('/api/company/verifications', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const createdRequest = data?.request;
                const order = data?.razorpayOrder;

                if (!createdRequest?.id || !order?.id || !order?.keyId) {
                    toast.error('Failed to initialize payment order.');
                    return;
                }

                let paymentResponse;
                try {
                    paymentResponse = await openRazorpayCheckout({
                        keyId: order.keyId,
                        orderId: order.id,
                        amount: order.amount,
                        currency: order.currency || 'INR',
                        name: order.name || 'Global Academy of Technology',
                        description: order.description || `Verification Request ${createdRequest.requestId || createdRequest.id}`,
                        prefill: {
                            name: contactPerson,
                            email: effectiveEmail,
                            contact: phoneNumber,
                        }
                    });
                } catch (checkoutErr: any) {
                    toast.error(checkoutErr?.message || 'Payment cancelled. You can retry from support if needed.');
                    return;
                }

                const verifyRes = await apiFetch(`/api/company/verifications/${createdRequest.id}/verify-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        razorpayOrderId: paymentResponse.razorpay_order_id,
                        razorpayPaymentId: paymentResponse.razorpay_payment_id,
                        razorpaySignature: paymentResponse.razorpay_signature
                    })
                });

                if (!verifyRes.ok) {
                    const verifyData = await verifyRes.json().catch(() => null);
                    toast.error(verifyData?.message || 'Payment verification failed. Contact support.');
                    return;
                }

                toast.success('Payment successful. Request submitted.');
                setStudentName('');
                setUsn('');
                setVerificationTemplate(null);

                if (token) {
                    await fetchRequests(token);
                }
                setPanelView('requests');
                router.replace('/company/requests');
            } else {
                if (res.status === 401 || res.status === 403) {
                    handleUnauthorized();
                    return;
                }
                const data = await res.json();
                toast.error(data.message || 'Failed to submit verification request.');
            }
        } catch (error) {
            toast.error('Network error. Failed to submit.');
        } finally {
            setLoading(false);
        }
    };

    const extractDownloadName = (contentDisposition: string | null, fallbackName: string) => {
        if (!contentDisposition) return fallbackName;
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
        const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        return plainMatch?.[1] || fallbackName;
    };

    const handleDownloadResponse = async (id: string, requestId: string) => {
        const token = sessionStorage.getItem('companyToken');
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
            link.download = extractDownloadName(res.headers.get('content-disposition'), `${requestId}-completed-file`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Download failed');
        }
    };

    const retryVerificationPayment = async (request: VerificationRequest) => {
        const token = sessionStorage.getItem('companyToken');
        if (!token) {
            handleUnauthorized();
            return;
        }

        setPayingRequestId(request.id);
        try {
            const orderRes = await fetch(`${API_BASE}/api/company/verifications/${request.id}/create-payment-order`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const orderData = await orderRes.json().catch(() => null);
            if (!orderRes.ok) {
                toast.error(orderData?.message || 'Unable to start payment');
                return;
            }

            const order = orderData?.razorpayOrder;
            if (!order?.id || !order?.keyId) {
                toast.error('Invalid payment order response');
                return;
            }

            const paymentResponse = await openRazorpayCheckout({
                keyId: order.keyId,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: order.name || 'Global Academy of Technology',
                description: order.description || `Verification Request ${request.requestId}`,
                prefill: {
                    name: request.companyName,
                    email: companyEmail || sessionStorage.getItem('companyEmail') || undefined,
                }
            });

            const verifyRes = await fetch(`${API_BASE}/api/company/verifications/${request.id}/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    razorpayOrderId: paymentResponse.razorpay_order_id,
                    razorpayPaymentId: paymentResponse.razorpay_payment_id,
                    razorpaySignature: paymentResponse.razorpay_signature
                })
            });

            const verifyData = await verifyRes.json().catch(() => null);
            if (!verifyRes.ok) {
                toast.error(verifyData?.message || 'Payment verification failed');
                return;
            }

            toast.success('Payment successful');
            await fetchRequests(token);
            setPanelView('requests');
            router.replace('/company/requests');
        } catch (error: any) {
            toast.error(error?.message || 'Payment failed or cancelled');
        } finally {
            setPayingRequestId(null);
        }
    };

    const canCancelVerification = (request: VerificationRequest) => {
        return request.status === 'PENDING' && request.paymentStatus === 'PAID';
    };

    const isCancelledVerification = (request: VerificationRequest) => {
        return request.status === 'REJECTED' && String(request.rejectionReason || '').toLowerCase().includes('cancelled by company');
    };

    const getVerificationStatusLabel = (request: VerificationRequest) => {
        return isCancelledVerification(request) ? 'CANCELLED' : request.status;
    };

    const getVerificationStatusBadgeClass = (request: VerificationRequest) => {
        if (isCancelledVerification(request)) return 'border-slate-400 text-slate-700 bg-slate-100';
        if (request.status === 'COMPLETED') return 'border-green-500 text-green-700 bg-green-50';
        if (request.status === 'PROCESSING') return 'border-blue-500 text-blue-700 bg-blue-50';
        if (request.status === 'REJECTED') return 'border-red-500 text-red-700 bg-red-50';
        return 'border-yellow-500 text-yellow-700 bg-yellow-50';
    };

    const getVerificationRefundLabel = (request: VerificationRequest) => {
        if (request.paymentStatus === 'REFUNDED') return 'REFUNDED';
        if (isCancelledVerification(request) && request.paymentStatus === 'PAID') return 'REFUND_PENDING';
        return 'N/A';
    };

    const getVerificationRefundBadgeClass = (request: VerificationRequest) => {
        const refundLabel = getVerificationRefundLabel(request);
        if (refundLabel === 'REFUNDED') return 'border-emerald-500 text-emerald-700 bg-emerald-50';
        if (refundLabel === 'REFUND_PENDING') return 'border-amber-500 text-amber-700 bg-amber-50';
        return 'border-slate-300 text-slate-600 bg-slate-50';
    };

    const cancelVerificationRequest = async (request: VerificationRequest) => {
        const token = sessionStorage.getItem('companyToken');
        if (!token) {
            handleUnauthorized();
            return;
        }

        if (!canCancelVerification(request)) {
            toast.error('This request cannot be cancelled now');
            return;
        }

        setCancellingRequestId(request.id);
        try {
            const res = await fetch(`${API_BASE}/api/company/verifications/${request.id}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(data?.message || 'Failed to cancel request');
                return;
            }

            toast.success(data?.message || 'Request cancelled successfully');
            await fetchRequests(token);
        } catch {
            toast.error('Failed to cancel request. Please try again.');
        } finally {
            setCancellingRequestId(null);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('companyToken');
        sessionStorage.removeItem('companyEmail');
        setIsAuthenticated(false);
        setStep(1);
        router.push('/company');
    };

    const filteredCompanyRequests = requests.filter((req) => {
        const q = requestSearch.trim().toLowerCase();
        const matchesSearch = !q ||
            String(req.requestId || '').toLowerCase().includes(q) ||
            String(req.studentName || '').toLowerCase().includes(q) ||
            String(req.usn || '').toLowerCase().includes(q) ||
            String(req.status || '').toLowerCase().includes(q);

        const matchesStatus = requestStatusFilter === 'ALL' || req.status === requestStatusFilter;
        return matchesSearch && matchesStatus;
    });

    const requestStatusRank: Record<string, number> = {
        PENDING: 1,
        PROCESSING: 2,
        COMPLETED: 3,
        REJECTED: 4,
    };

    const sortedCompanyRequests = [...filteredCompanyRequests].sort((a, b) => {
        if (requestSortBy === 'OLDEST') {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (requestSortBy === 'STATUS_ASC') {
            return (requestStatusRank[a.status] || 99) - (requestStatusRank[b.status] || 99);
        }
        if (requestSortBy === 'STATUS_DESC') {
            return (requestStatusRank[b.status] || 99) - (requestStatusRank[a.status] || 99);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

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
        <div className="flex min-h-[calc(100vh-176px)] flex-col">
            {/* Mobile-only top bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
                <span className="font-bold text-yellow-700">Company Panel</span>
                <button
                    aria-label="Open navigation menu"
                    onClick={() => setIsSidebarOpen(true)}
                    className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            <div className="relative flex flex-1 overflow-hidden">
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

            <aside className={[
                'flex flex-shrink-0 flex-col border-r bg-white transition-all duration-300',
                'fixed inset-y-0 left-0 z-40 w-64',
                'md:static md:inset-y-auto md:z-auto',
                isSidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:translate-x-0 md:w-20',
            ].join(' ')}>
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
                        onClick={() => setIsSidebarOpen(false)}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 md:hidden"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="hidden md:flex p-1 rounded-md hover:bg-slate-100 text-slate-500"
                    >
                        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
                    <button
                        onClick={() => { router.push('/company'); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${panelView === 'dashboard' ? 'bg-yellow-50 text-yellow-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-yellow-700'} ${!isSidebarOpen && 'justify-center px-0'}`}
                    >
                        <LayoutDashboard size={20} className={panelView === 'dashboard' ? 'text-yellow-700' : 'text-slate-400'} />
                        {isSidebarOpen && <span className="truncate">Dashboard</span>}
                    </button>
                    <button
                        onClick={() => { router.push('/company/requests'); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${panelView === 'requests' ? 'bg-yellow-50 text-yellow-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-yellow-700'} ${!isSidebarOpen && 'justify-center px-0'}`}
                    >
                        <ClipboardList size={20} className={panelView === 'requests' ? 'text-yellow-700' : 'text-slate-400'} />
                        {isSidebarOpen && <span className="truncate">My Requests</span>}
                    </button>
                    <button
                        onClick={() => { router.push('/company/apply'); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
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

            <main className="min-w-0 flex-1 overflow-x-auto bg-slate-50 p-4 md:p-8">
                <div className="mx-auto max-w-5xl space-y-8">
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
                                            <TableHead className="whitespace-nowrap">Payment / Refund</TableHead>
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
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className={
                                                            req.paymentStatus === 'PAID'
                                                                ? 'border-green-500 text-green-700 bg-green-50'
                                                                : req.paymentStatus === 'REFUNDED'
                                                                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                                                                    : 'border-yellow-500 text-yellow-700 bg-yellow-50'
                                                        }>
                                                            {req.paymentStatus}
                                                        </Badge>
                                                        <Badge variant="outline" className={getVerificationRefundBadgeClass(req)}>
                                                            {getVerificationRefundLabel(req)}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className={getVerificationStatusBadgeClass(req)}>
                                                            {getVerificationStatusLabel(req)}
                                                        </Badge>
                                                        {req.status === 'REJECTED' && req.rejectionReason ? (
                                                            <p className="max-w-[260px] whitespace-normal text-xs text-red-700">
                                                                {isCancelledVerification(req) ? 'Cancellation Note:' : 'Reason:'} {req.rejectionReason}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-500 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {canCancelVerification(req) ? (
                                                        <div className="flex flex-col items-start gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-700 border-red-300 hover:bg-red-50"
                                                                disabled={cancellingRequestId === req.id}
                                                                onClick={() => cancelVerificationRequest(req)}
                                                            >
                                                                {cancellingRequestId === req.id ? 'Cancelling...' : 'Cancel & Refund'}
                                                            </Button>
                                                            <span className="text-[11px] text-slate-500">Refund goes to the original payment method.</span>
                                                        </div>
                                                    ) : req.status === 'COMPLETED' && req.paymentStatus === 'PAID' ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDownloadResponse(req.id, req.requestId)}
                                                        >
                                                            Download
                                                        </Button>
                                                    ) : req.paymentStatus !== 'PAID' && req.status !== 'REJECTED' ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-amber-700 border-amber-300 hover:bg-amber-50"
                                                            disabled={payingRequestId === req.id}
                                                            onClick={() => retryVerificationPayment(req)}
                                                        >
                                                            {payingRequestId === req.id ? 'Processing...' : 'Pay Now'}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">Not available</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {requests.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
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
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-lg text-white">
                                <div className="flex items-center gap-3">
                                    <ClipboardList className="h-6 w-6 text-orange-400" />
                                    <h2 className="text-lg font-bold tracking-tight">My Verification Applications</h2>
                                    <span className="text-sm text-slate-400">{requests.length} requests</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                                    onClick={() => {
                                        const token = sessionStorage.getItem('companyToken');
                                        if (token) fetchRequests(token);
                                    }}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                                </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-800 p-3 rounded-lg text-slate-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Status:</span>
                                    <Select value={requestStatusFilter} onValueChange={(value) => setRequestStatusFilter(value || 'ALL')}>
                                        <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-slate-200 h-8">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 text-slate-200 border-slate-700">
                                            <SelectItem value="ALL">All</SelectItem>
                                            <SelectItem value="PENDING">Pending</SelectItem>
                                            <SelectItem value="PROCESSING">Processing</SelectItem>
                                            <SelectItem value="COMPLETED">Completed</SelectItem>
                                            <SelectItem value="REJECTED">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <ArrowUpDown className="h-4 w-4 text-slate-400" />
                                    <Select value={requestSortBy} onValueChange={(value) => setRequestSortBy(value || 'NEWEST')}>
                                        <SelectTrigger className="w-44 bg-slate-700 border-slate-600 text-slate-200 h-8">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 text-slate-200 border-slate-700">
                                            <SelectItem value="NEWEST">Newest First</SelectItem>
                                            <SelectItem value="OLDEST">Oldest First</SelectItem>
                                            <SelectItem value="STATUS_ASC">Status (A-Z)</SelectItem>
                                            <SelectItem value="STATUS_DESC">Status (Z-A)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="relative w-full sm:w-72 sm:ml-auto">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search by ID, student, USN, status..."
                                        className="pl-9 h-9 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
                                        value={requestSearch}
                                        onChange={(e) => setRequestSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                        <Card className="overflow-hidden shadow-md border border-slate-200">
                            <CardHeader>
                                <CardTitle>All Verification Requests</CardTitle>
                                <CardDescription>Track all requests and download completed responses.</CardDescription>
                            </CardHeader>
                            <div className="overflow-x-auto w-full">
                                <Table className="w-full min-w-5xl text-sm">
                                    <TableHeader className="bg-slate-900 border-y">
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap text-slate-200 font-semibold">Request ID</TableHead>
                                            <TableHead className="whitespace-nowrap text-slate-200 font-semibold">Student Name</TableHead>
                                            <TableHead className="whitespace-nowrap text-slate-200 font-semibold">USN</TableHead>
                                            <TableHead className="whitespace-nowrap text-slate-200 font-semibold">Payment / Refund</TableHead>
                                            <TableHead className="whitespace-nowrap text-slate-200 font-semibold">Status</TableHead>
                                            <TableHead className="whitespace-nowrap text-slate-200 font-semibold">Date</TableHead>
                                            <TableHead className="whitespace-nowrap text-slate-200 font-semibold">Download Response</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedCompanyRequests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium text-blue-600 whitespace-nowrap">{req.requestId}</TableCell>
                                                <TableCell className="whitespace-nowrap font-medium">{req.studentName}</TableCell>
                                                <TableCell className="whitespace-nowrap text-slate-600">{req.usn}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className={
                                                            req.paymentStatus === 'PAID'
                                                                ? 'border-green-500 text-green-700 bg-green-50'
                                                                : req.paymentStatus === 'REFUNDED'
                                                                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                                                                    : 'border-yellow-500 text-yellow-700 bg-yellow-50'
                                                        }>
                                                            {req.paymentStatus}
                                                        </Badge>
                                                        <Badge variant="outline" className={getVerificationRefundBadgeClass(req)}>
                                                            {getVerificationRefundLabel(req)}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className={getVerificationStatusBadgeClass(req)}>
                                                            {getVerificationStatusLabel(req)}
                                                        </Badge>
                                                        {req.status === 'REJECTED' && req.rejectionReason ? (
                                                            <p className="max-w-[260px] whitespace-normal text-xs text-red-700">
                                                                {isCancelledVerification(req) ? 'Cancellation Note:' : 'Reason:'} {req.rejectionReason}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-500 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {canCancelVerification(req) ? (
                                                        <div className="flex flex-col items-start gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-700 border-red-300 hover:bg-red-50"
                                                                disabled={cancellingRequestId === req.id}
                                                                onClick={() => cancelVerificationRequest(req)}
                                                            >
                                                                {cancellingRequestId === req.id ? 'Cancelling...' : 'Cancel & Refund'}
                                                            </Button>
                                                            <span className="text-[11px] text-slate-500">Refund goes to the original payment method.</span>
                                                        </div>
                                                    ) : req.status === 'COMPLETED' && req.paymentStatus === 'PAID' ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDownloadResponse(req.id, req.requestId)}
                                                        >
                                                            Download
                                                        </Button>
                                                    ) : req.paymentStatus !== 'PAID' && req.status !== 'REJECTED' ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-amber-700 border-amber-300 hover:bg-amber-50"
                                                            disabled={payingRequestId === req.id}
                                                            onClick={() => retryVerificationPayment(req)}
                                                        >
                                                            {payingRequestId === req.id ? 'Processing...' : 'Pay Now'}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">Not available</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {sortedCompanyRequests.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">No requests found.</TableCell>
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
                                        <span className="text-xs mt-1">Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG</span>
                                        <span className="text-xs">Maximum size: 10MB</span>
                                        <input
                                            id="template-upload"
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            required
                                            onChange={(e) => {
                                                const selected = e.target.files?.[0] || null;
                                                if (selected) {
                                                    const extension = selected.name.split('.').pop()?.toLowerCase() || '';
                                                    if (!ALLOWED_TEMPLATE_EXTENSIONS.includes(extension)) {
                                                        toast.error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG.');
                                                        e.currentTarget.value = '';
                                                        return;
                                                    }
                                                    if (selected.size > MAX_TEMPLATE_SIZE_BYTES) {
                                                        toast.error('File too large. Maximum allowed size is 10MB.');
                                                        e.currentTarget.value = '';
                                                        return;
                                                    }
                                                }
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
        </div>
    );
}
