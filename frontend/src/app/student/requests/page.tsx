"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { API_BASE } from '@/lib/api';
import { toast } from 'sonner';
import { openZwitchCheckout } from '@/lib/zwitch';
import { verifyStudentCertificatePaymentWithRetry } from '@/lib/payment';

export default function StudentRequests() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('NEWEST');
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        const token = sessionStorage.getItem('token');
        if (!token) {
            router.push('/student/login');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/student/certificates`, {
                cache: 'no-store',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            } else {
                if (res.status === 401) {
                    sessionStorage.removeItem('token');
                    router.push('/student/login');
                }
            }
        } catch (err) {
            console.error("Error fetching requests", err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const extractDownloadName = (contentDisposition: string | null, fallbackName: string) => {
        if (!contentDisposition) return fallbackName;
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
        const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        return plainMatch?.[1] || fallbackName;
    };

    const downloadCertificate = async (requestId: string) => {
        const token = sessionStorage.getItem('token');
        if (!token) {
            router.push('/student/login');
            return;
        }

        setDownloadingId(requestId);
        try {
            const res = await fetch(`${API_BASE}/api/student/certificates/${requestId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                toast.error(data?.message || 'Unable to download certificate');
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = extractDownloadName(res.headers.get('content-disposition'), `${requestId}-certificate`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Download failed. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const downloadAcknowledgement = async (requestId: string) => {
        const token = sessionStorage.getItem('token');
        if (!token) {
            router.push('/student/login');
            return;
        }

        setDownloadingId(requestId);
        try {
            const res = await fetch(`${API_BASE}/api/student/certificates/${requestId}/acknowledgement`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                toast.error(data?.message || 'Unable to download acknowledgement');
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = extractDownloadName(res.headers.get('content-disposition'), `${requestId}-acknowledgement.html`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Acknowledgement download failed. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const retryPayment = async (req: any) => {
        const token = sessionStorage.getItem('token');
        if (!token) {
            router.push('/student/login');
            return;
        }

        setPayingId(req.id);
        try {
            const orderRes = await fetch(`${API_BASE}/api/student/certificates/${req.id}/create-payment-order`, {
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

            toast.message('Payment window opened. Verifying automatically after completion...');

            const verification = await verifyStudentCertificatePaymentWithRetry({
                requestId: req.id,
                zwitchOrderId: order.id,
                token,
                attempts: 12,
                intervalMs: 3000,
            });

            if (!verification.verified) {
                await fetch(`${API_BASE}/api/student/certificates/${req.id}/mark-payment-failed`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => undefined);
                toast.error(verification.message || 'Payment is still processing. Refresh My Requests shortly.');
                await fetchRequests();
                return;
            }

            toast.success('Payment successful');
            fetchRequests();
        } catch (error: any) {
            const paymentMessage = String(error?.message || '').toLowerCase();
            await fetch(`${API_BASE}/api/student/certificates/${req.id}/mark-payment-failed`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => undefined);
            if (paymentMessage.includes('cancelled')) {
                toast.message('Payment was cancelled. You can retry when ready.');
            } else {
                toast.error(error?.message || 'Payment failed');
            }
        } finally {
            setPayingId(null);
        }
    };

    const isCancelledRequest = (req: any) => {
        return req.status === 'REJECTED' && String(req.rejectionReason || '').toLowerCase().includes('cancelled by user');
    };

    const getStatusLabel = (req: any) => {
        return isCancelledRequest(req) ? 'CANCELLED' : req.status;
    };

    const getStatusBadgeClass = (req: any) => {
        if (isCancelledRequest(req)) return 'border-slate-400 text-slate-700 bg-slate-100';
        if (req.status === 'COMPLETED') return 'border-green-500 text-green-700 bg-green-50';
        if (req.status === 'PROCESSING') return 'border-blue-500 text-blue-700 bg-blue-50';
        if (req.status === 'REJECTED') return 'border-red-500 text-red-700 bg-red-50';
        return 'border-yellow-500 text-yellow-700 bg-yellow-50';
    };

    const getPaymentMeta = (req: any) => {
        if (req.paymentStatus === 'REFUND_COMPLETED' || req.paymentStatus === 'REFUNDED') {
            return {
                label: 'REFUND COMPLETED',
                className: 'border-emerald-500 text-emerald-700 bg-emerald-50',
                hint: 'Refund completed'
            };
        }

        if (req.paymentStatus === 'REFUND_INITIATED' || (isCancelledRequest(req) && req.paymentStatus === 'PAID')) {
            return {
                label: 'REFUND IN PROGRESS',
                className: 'border-amber-500 text-amber-700 bg-amber-50',
                hint: 'Refund initiated. It may take 5-7 working days.'
            };
        }

        if (req.paymentStatus === 'PAID') {
            return {
                label: 'PAID',
                className: 'border-green-500 text-green-700 bg-green-50',
                hint: ''
            };
        }

        if (req.paymentStatus === 'FAILED') {
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

    const filteredRequests = requests.filter((req) => {
        const q = search.trim().toLowerCase();
        const matchesSearch = !q ||
            String(req.id || '').toLowerCase().includes(q) ||
            String(req.certificateType || '').toLowerCase().includes(q) ||
            String(req.status || '').toLowerCase().includes(q) ||
            String(req.usn || '').toLowerCase().includes(q);

        const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusRank: Record<string, number> = {
        PENDING: 1,
        PROCESSING: 2,
        COMPLETED: 3,
        REJECTED: 4,
    };

    const sortedRequests = [...filteredRequests].sort((a, b) => {
        if (sortBy === 'OLDEST') {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'STATUS_ASC') {
            return (statusRank[a.status] || 99) - (statusRank[b.status] || 99);
        }
        if (sortBy === 'STATUS_DESC') {
            return (statusRank[b.status] || 99) - (statusRank[a.status] || 99);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading your requests...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
                <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-700" />
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">My Applications</h1>
                    <span className="text-sm text-slate-500">{requests.length} requests</span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={fetchRequests}
                >
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Status:</span>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || 'ALL')}>
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
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value || 'NEWEST')}>
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
                        placeholder="Search by ID, type, status, USN..."
                        className="h-9 border-slate-300 bg-white pl-9 text-slate-700 placeholder:text-slate-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden shadow-md border border-slate-200">
                <div className="overflow-x-auto w-full pb-2">
                    <Table className="w-full min-w-245 text-sm">
                        <TableHeader className="border-b bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">Request ID</TableHead>
                                <TableHead className="font-semibold text-slate-700">Certificate Type</TableHead>
                                <TableHead className="font-semibold text-slate-700">Delivery Mode</TableHead>
                                <TableHead className="font-semibold text-slate-700">Payment</TableHead>
                                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                                <TableHead className="font-semibold text-slate-700">Date Applied</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedRequests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium text-blue-600">{req.id}</TableCell>
                                    <TableCell>{formatEnumValue(req.certificateType)}</TableCell>
                                    <TableCell>{formatEnumValue(req.copyType)}</TableCell>
                                    <TableCell className="w-40 overflow-hidden">
                                        <div className="space-y-1">
                                            <Badge variant="outline" className={getPaymentMeta(req).className}>
                                                {getPaymentMeta(req).label}
                                            </Badge>
                                            <p className="text-xs text-slate-500">Amount: Rs {Number(req.amount || 0).toFixed(2)}</p>
                                            <p className="text-xs text-slate-400 truncate" title={req.paymentOrderId || 'N/A'}>Order ID: {req.paymentOrderId || 'N/A'}</p>
                                            {getPaymentMeta(req).hint ? <p className="text-xs text-slate-500">{getPaymentMeta(req).hint}</p> : null}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Badge variant="outline" className={getStatusBadgeClass(req)}>
                                                {getStatusLabel(req)}
                                            </Badge>
                                            {req.status === 'REJECTED' && req.rejectionReason ? (
                                                <p className="max-w-65 whitespace-normal text-xs text-red-700">
                                                    {isCancelledRequest(req) ? 'Cancellation Note:' : 'Reason:'} {req.rejectionReason}
                                                </p>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        {req.paymentStatus !== 'PAID' && req.status === 'PENDING' ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="inline-flex text-amber-700 border-amber-300"
                                                onClick={() => retryPayment(req)}
                                                disabled={payingId === req.id}
                                            >
                                                {payingId === req.id ? 'Processing...' : 'Pay Now'}
                                            </Button>
                                        ) : req.paymentStatus === 'PAID' ? (
                                            <div className="inline-flex items-center gap-2">
                                                {req.issuedCertificateUrl && (req.copyType === 'SOFT_COPY' || req.copyType === 'BOTH') ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="inline-flex text-blue-600 border-blue-200"
                                                        onClick={() => downloadCertificate(req.id)}
                                                        disabled={downloadingId === req.id}
                                                    >
                                                        <Download className="h-4 w-4 mr-2" /> Certificate
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="inline-flex text-slate-700 border-slate-300"
                                                    onClick={() => downloadAcknowledgement(req.id)}
                                                    disabled={downloadingId === req.id}
                                                >
                                                    <FileText className="h-4 w-4 mr-2" /> Acknowledgement
                                                </Button>
                                            </div>
                                        ) : (
                                            <Dialog>
                                                <DialogTrigger className="h-8 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors">
                                                    View Details
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>Request ID: {req.id}</DialogTitle>
                                                        <DialogDescription>Details of your certificate application.</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Certificate Type</p>
                                                                <p className="font-medium text-slate-900">{formatEnumValue(req.certificateType)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Status</p>
                                                                <Badge variant="outline" className={getStatusBadgeClass(req)}>
                                                                    {getStatusLabel(req)}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Delivery Mode</p>
                                                                <p className="font-medium text-slate-900">{formatEnumValue(req.copyType)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Amount Paid</p>
                                                                <p className="font-medium text-slate-900">₹ {req.amount}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Payment Status</p>
                                                                <Badge variant="outline" className={getPaymentMeta(req).className}>
                                                                    {getPaymentMeta(req).label}
                                                                </Badge>
                                                                <p className="mt-1 text-xs text-slate-500">Amount: Rs {Number(req.amount || 0).toFixed(2)}</p>
                                                                <p className="text-xs text-slate-500 break-all">Payment Order ID: {req.paymentOrderId || 'N/A'}</p>
                                                                {getPaymentMeta(req).hint ? <p className="mt-1 text-xs text-slate-500">{getPaymentMeta(req).hint}</p> : null}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Date Applied</p>
                                                                <p className="font-medium text-slate-900">{new Date(req.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        {(req.reason || req.address) && (
                                                            <div className="pt-4 border-t space-y-3">
                                                                {req.reason && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-500">Reason</p>
                                                                        <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded-md mt-1">{req.reason}</p>
                                                                    </div>
                                                                )}
                                                                {req.address && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-500">Delivery Address</p>
                                                                        <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded-md mt-1 leading-relaxed">{req.address}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {req.status === 'REJECTED' && req.rejectionReason && (
                                                            <div className="pt-4 border-t">
                                                                <p className="text-sm font-medium text-red-700">
                                                                    {req.rejectionReason.includes('Cancelled by user') ? 'Cancellation Note' : 'Rejection Reason'}
                                                                </p>
                                                                <p className="mt-1 rounded-md bg-red-50 p-2 text-sm text-red-800">{req.rejectionReason}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {sortedRequests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                        No requests found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
