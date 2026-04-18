"use client";

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, UploadCloud, Building2, CreditCard, FileText, CheckCircle, Clock, Menu, ChevronLeft, ChevronRight, ClipboardList, FilePlus, LogOut, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, API_BASE } from '@/lib/api';
import { openZwitchCheckout } from '@/lib/zwitch';
import { verifyCompanyVerificationPaymentWithRetry } from '@/lib/payment';

type VerificationRequest = {
    id: string;
    requestId: string;
    companyName: string;
    studentName: string;
    usn: string;
    paymentOrderId?: string | null;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    rejectionReason?: string | null;
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
    const [panelView, setPanelView] = useState<'dashboard' | 'requests' | 'application'>('application');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Auth States
    const [isAuthenticated, setIsAuthenticated] = useState(false);

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

    const handleUnauthorized = useCallback(() => {
        sessionStorage.removeItem('companyToken');
        sessionStorage.removeItem('companyEmail');
        setIsAuthenticated(false);
        setPanelView('application');
        setMainLoading(false);
        toast.error('Session expired. Please login again.');
        router.push('/auth');
    }, [router]);

    const fetchRequests = useCallback(async (token: string) => {
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
    }, [handleUnauthorized]);

    useEffect(() => {
        const loadingGuard = window.setTimeout(() => {
            setMainLoading(false);
        }, 15000);

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

            const loadProfile = async () => {
                try {
                    const res = await apiFetch('/api/auth/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) return;

                    const data = await res.json().catch(() => null);
                    const companyProfile = data?.companyProfile;
                    const user = data?.user;

                    if (companyProfile?.companyName) setCompanyName(String(companyProfile.companyName));
                    if (companyProfile?.contactPerson) setContactPerson(String(companyProfile.contactPerson));
                    if (companyProfile?.phoneNumber) setPhoneNumber(String(companyProfile.phoneNumber));
                    if (user?.email) setCompanyEmail(String(user.email));
                } catch {
                    // Keep manual entry when profile fetch is unavailable.
                }
            };

            void loadProfile();
        } else {
            setMainLoading(false);
            router.replace('/auth');
        }

        return () => window.clearTimeout(loadingGuard);
    }, [fetchRequests, router]);

    useEffect(() => {
        if (pathname === '/company/requests') {
            setPanelView('requests');
        } else if (pathname === '/company/apply') {
            setPanelView('application');
        } else {
            // Default /company route: direct to apply form as requested.
            setPanelView('application');
        }

        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, [pathname, requests.length]);

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
        let createdRequestId = '';

        try {
            const token = sessionStorage.getItem('companyToken');
            const effectiveEmail = companyEmail || sessionStorage.getItem('companyEmail') || '';
            const templateFile = verificationTemplate;

            if (!token) {
                handleUnauthorized();
                return;
            }

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
                const order = data?.zwitchOrder;
                createdRequestId = String(createdRequest?.id || '');

                if (!createdRequest?.id || !order?.id || !order?.accessKey) {
                    toast.error('Failed to initialize payment order.');
                    return;
                }

                try {
                    await openZwitchCheckout({
                        paymentToken: order.id,
                        accessKey: order.accessKey,
                        fallbackAccessKey: order.fallbackAccessKey,
                        environment: order.environment
                    });
                } catch (checkoutErr: any) {
                    await fetch(`${API_BASE}/api/company/verifications/${createdRequest.id}/mark-payment-failed`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(() => undefined);
                    toast.error(checkoutErr?.message || 'Unable to open payment checkout.');
                    return;
                }

                toast.message('Payment window opened. Verifying automatically...');

                const verification = await verifyCompanyVerificationPaymentWithRetry({
                    requestId: createdRequest.id,
                    zwitchOrderId: order.id,
                    token,
                    attempts: 12,
                    intervalMs: 3000,
                });

                if (!verification.verified) {
                    await fetch(`${API_BASE}/api/company/verifications/${createdRequest.id}/mark-payment-failed`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(() => undefined);
                    toast.error(verification.message || 'Payment is still processing. Check requests page shortly.');
                    setPanelView('requests');
                    router.replace('/company/requests');
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
        } catch {
            const token = sessionStorage.getItem('companyToken');
            if (token && createdRequestId) {
                await fetch(`${API_BASE}/api/company/verifications/${createdRequestId}/mark-payment-failed`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => undefined);
            }
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
        } catch {
            toast.error('Download failed');
        }
    };

    const handleDownloadAcknowledgement = async (id: string, requestId: string) => {
        const token = sessionStorage.getItem('companyToken');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/company/verifications/${id}/acknowledgement`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    handleUnauthorized();
                    return;
                }
                const data = await res.json().catch(() => null);
                toast.error(data?.message || 'Acknowledgement not available');
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = extractDownloadName(res.headers.get('content-disposition'), `${requestId}-acknowledgement.html`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Acknowledgement download failed');
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

            const order = orderData?.zwitchOrder;
            if (!order?.id || !order?.accessKey) {
                toast.error('Invalid payment order response');
                return;
            }

            await openZwitchCheckout({
                paymentToken: order.id,
                accessKey: order.accessKey,
                fallbackAccessKey: order.fallbackAccessKey,
                environment: order.environment
            });

            toast.message('Payment window opened. Verifying automatically...');

            const verification = await verifyCompanyVerificationPaymentWithRetry({
                requestId: request.id,
                zwitchOrderId: order.id,
                token,
                attempts: 12,
                intervalMs: 3000,
            });

            if (!verification.verified) {
                await fetch(`${API_BASE}/api/company/verifications/${request.id}/mark-payment-failed`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => undefined);
                toast.error(verification.message || 'Payment is still processing. Refresh requests shortly.');
                await fetchRequests(token);
                return;
            }

            toast.success('Payment successful');
            await fetchRequests(token);
            setPanelView('requests');
            router.replace('/company/requests');
        } catch (error: any) {
            const message = String(error?.message || '').toLowerCase();
            await fetch(`${API_BASE}/api/company/verifications/${request.id}/mark-payment-failed`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => undefined);
            if (message.includes('cancelled')) {
                toast.message('Payment was cancelled. You can retry when ready.');
            } else {
                toast.error(error?.message || 'Payment failed');
            }
        } finally {
            setPayingRequestId(null);
        }
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

    const getVerificationPaymentMeta = (request: VerificationRequest) => {
        if (request.paymentStatus === 'REFUND_COMPLETED' || request.paymentStatus === 'REFUNDED') {
            return {
                label: 'REFUND COMPLETED',
                className: 'border-emerald-500 text-emerald-700 bg-emerald-50',
                hint: 'Refund completed'
            };
        }

        if (request.paymentStatus === 'REFUND_INITIATED' || (isCancelledVerification(request) && request.paymentStatus === 'PAID')) {
            return {
                label: 'REFUND IN PROGRESS',
                className: 'border-amber-500 text-amber-700 bg-amber-50',
                hint: 'Refund initiated. It may take 5-7 working days.'
            };
        }

        if (request.paymentStatus === 'PAID') {
            return {
                label: 'PAID',
                className: 'border-green-500 text-green-700 bg-green-50',
                hint: ''
            };
        }

        if (request.paymentStatus === 'FAILED') {
            return {
                label: 'FAILED',
                className: 'border-red-500 text-red-700 bg-red-50',
                hint: 'Previous payment attempt failed. Retry to continue.'
            };
        }

        return {
            label: 'PAYMENT REQUIRED',
            className: 'border-yellow-500 text-yellow-700 bg-yellow-50',
            hint: 'Complete payment to send this request to admin.'
        };
    };

    const formatEnumValue = (value: string) => {
        return String(value || '')
            .split('_')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    };

    const canPayVerification = (request: VerificationRequest) => {
        const paymentNeedsRetry = request.paymentStatus === 'PENDING' || request.paymentStatus === 'FAILED';
        return paymentNeedsRetry && request.status === 'PENDING';
    };

    const handleLogout = () => {
        sessionStorage.removeItem('companyToken');
        sessionStorage.removeItem('companyEmail');
        setIsAuthenticated(false);
        router.push('/auth');
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
        return <div className="p-8 text-center text-slate-500 min-h-[70vh] flex items-center justify-center">Redirecting to secure sign in...</div>;
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
                'flex shrink-0 flex-col border-r bg-white transition-all duration-300',
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
                                            <TableHead className="whitespace-nowrap">Payment</TableHead>
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
                                                <TableCell className="w-40 overflow-hidden">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className={getVerificationPaymentMeta(req).className}>
                                                            {getVerificationPaymentMeta(req).label}
                                                        </Badge>
                                                        <p className="text-xs text-slate-500">Amount: Rs {VERIFICATION_FEE.toFixed(2)}</p>
                                                        <p className="text-xs text-slate-500 truncate" title={req.paymentOrderId || 'N/A'}>Order ID: {req.paymentOrderId || 'N/A'}</p>
                                                        {getVerificationPaymentMeta(req).hint ? <p className="text-xs text-slate-500">{getVerificationPaymentMeta(req).hint}</p> : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className={getVerificationStatusBadgeClass(req)}>
                                                            {formatEnumValue(getVerificationStatusLabel(req))}
                                                        </Badge>
                                                        {req.status === 'REJECTED' && req.rejectionReason ? (
                                                            <p className="max-w-65 whitespace-normal text-xs text-red-700">
                                                                {isCancelledVerification(req) ? 'Cancellation Note:' : 'Reason:'} {req.rejectionReason}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-500 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {req.paymentStatus === 'PAID' ? (
                                                        <div className="inline-flex items-center gap-2">
                                                            {req.status === 'COMPLETED' ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDownloadResponse(req.id, req.requestId)}
                                                                >
                                                                    Download
                                                                </Button>
                                                            ) : null}
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDownloadAcknowledgement(req.id, req.requestId)}
                                                            >
                                                                Ack
                                                            </Button>
                                                        </div>
                                                    ) : canPayVerification(req) ? (
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
                            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
                                <div className="flex items-center gap-3">
                                    <ClipboardList className="h-6 w-6 text-yellow-700" />
                                    <h2 className="text-lg font-bold tracking-tight text-slate-900">My Verification Applications</h2>
                                    <span className="text-sm text-slate-500">{requests.length} requests</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                    onClick={() => {
                                        const token = sessionStorage.getItem('companyToken');
                                        if (token) fetchRequests(token);
                                    }}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                                </Button>
                            </div>

                            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-700">Status:</span>
                                    <Select value={requestStatusFilter} onValueChange={(value) => setRequestStatusFilter(value || 'ALL')}>
                                        <SelectTrigger className="h-8 w-36 border-slate-300 bg-white text-slate-700">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent className="border-slate-200 bg-white text-slate-700">
                                            <SelectItem value="ALL">All</SelectItem>
                                            <SelectItem value="PENDING">Pending</SelectItem>
                                            <SelectItem value="PROCESSING">Processing</SelectItem>
                                            <SelectItem value="COMPLETED">Completed</SelectItem>
                                            <SelectItem value="REJECTED">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <ArrowUpDown className="h-4 w-4 text-slate-500" />
                                    <Select value={requestSortBy} onValueChange={(value) => setRequestSortBy(value || 'NEWEST')}>
                                        <SelectTrigger className="h-8 w-44 border-slate-300 bg-white text-slate-700">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent className="border-slate-200 bg-white text-slate-700">
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
                                        className="h-9 border-slate-300 bg-white pl-9 text-slate-700 placeholder:text-slate-400"
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
                                <Table className="w-full min-w-245 text-sm">
                                    <TableHeader className="border-y bg-slate-50">
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">Request ID</TableHead>
                                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">Student Name</TableHead>
                                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">USN</TableHead>
                                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">Payment</TableHead>
                                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">Status</TableHead>
                                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">Date</TableHead>
                                            <TableHead className="whitespace-nowrap font-semibold text-slate-700">Download Response</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedCompanyRequests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium text-blue-600 whitespace-nowrap">{req.requestId}</TableCell>
                                                <TableCell className="whitespace-nowrap font-medium">{req.studentName}</TableCell>
                                                <TableCell className="whitespace-nowrap text-slate-600">{req.usn}</TableCell>
                                                <TableCell className="w-40 overflow-hidden">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className={getVerificationPaymentMeta(req).className}>
                                                            {getVerificationPaymentMeta(req).label}
                                                        </Badge>
                                                        <p className="text-xs text-slate-500">Amount: Rs {VERIFICATION_FEE.toFixed(2)}</p>
                                                        <p className="text-xs text-slate-500 truncate" title={req.paymentOrderId || 'N/A'}>Order ID: {req.paymentOrderId || 'N/A'}</p>
                                                        {getVerificationPaymentMeta(req).hint ? <p className="text-xs text-slate-500">{getVerificationPaymentMeta(req).hint}</p> : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className={getVerificationStatusBadgeClass(req)}>
                                                            {formatEnumValue(getVerificationStatusLabel(req))}
                                                        </Badge>
                                                        {req.status === 'REJECTED' && req.rejectionReason ? (
                                                            <p className="max-w-65 whitespace-normal text-xs text-red-700">
                                                                {isCancelledVerification(req) ? 'Cancellation Note:' : 'Reason:'} {req.rejectionReason}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-500 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {req.paymentStatus === 'PAID' ? (
                                                        <div className="inline-flex items-center gap-2">
                                                            {req.status === 'COMPLETED' ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDownloadResponse(req.id, req.requestId)}
                                                                >
                                                                    Download
                                                                </Button>
                                                            ) : null}
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDownloadAcknowledgement(req.id, req.requestId)}
                                                            >
                                                                Ack
                                                            </Button>
                                                        </div>
                                                    ) : canPayVerification(req) ? (
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
                    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
                        <Card className="border border-slate-200 shadow-md">
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
                                        <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
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

                        <Card className="border border-slate-200 shadow-md">
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

                        <Card className="border border-slate-200 shadow-md">
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
                            <CardFooter className="border-t bg-slate-100 p-6">
                                <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-col text-center sm:text-left">
                                    <span className="text-xs text-amber-700 mt-1 font-medium">Please verify all details before payment. Submitted requests cannot be edited or cancelled.</span>
                                    <span className="text-sm text-slate-500">Verification Fee</span>
                                    <span className="text-2xl font-bold text-slate-900">₹ {VERIFICATION_FEE.toFixed(2)}</span>
                                </div>
                                <Button type="submit" size="lg" className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold w-full sm:w-auto px-8" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                                    {loading ? 'Processing...' : 'Pay & Submit Request'}
                                </Button>
                                </div>
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
