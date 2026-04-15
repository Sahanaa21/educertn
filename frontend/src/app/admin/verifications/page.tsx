"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CheckCircle, XCircle, Download, Upload, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

type VerificationRequest = {
    id: string;
    requestId: string;
    companyName: string;
    companyEmail: string;
    studentName: string;
    usn: string;
    uploadedTemplate: string;
    completedFile: string | null;
    paymentOrderId?: string | null;
    paymentStatus: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    rejectionReason?: string | null;
    createdAt: string;
};

export default function AdminVerifications() {
    const router = useRouter();
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

    const fetchRequests = useCallback(async () => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/verifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            } else if (res.status === 401 || res.status === 403) {
                router.push('/admin/login');
            }
        } catch (error) {
            console.error('Failed to fetch verifications:', error);
            toast.error('Failed to load verifications');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const updateStatus = async (id: string, status?: string, rejReason?: string, action?: string) => {
        setProcessingId(id);
        const token = sessionStorage.getItem('adminToken');
        try {
            const res = await fetch(`${API_BASE}/api/admin/verifications/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...(status ? { status } : {}),
                    ...(action ? { action } : {}),
                    ...(status === 'REJECTED' && rejReason ? { rejectionReason: rejReason } : {})
                })
            });

            if (res.ok) {
                toast.success(`Request marked as ${status}`);
                fetchRequests();
            } else {
                toast.error('Failed to update status');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setProcessingId(null);
        }
    };

    const extractDownloadName = (contentDisposition: string | null, fallbackName: string) => {
        if (!contentDisposition) return fallbackName;
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
        const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        return plainMatch?.[1] || fallbackName;
    };

    const downloadTemplate = async (id: string, requestId: string) => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/verifications/${id}/template`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error(data.message || 'Unable to download template');
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = extractDownloadName(res.headers.get('content-disposition'), `${requestId}-template`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Template download failed');
        }
    };

    const uploadCompletedFile = async (id: string, file: File | null) => {
        const token = sessionStorage.getItem('adminToken');
        if (!token || !file) return false;

        setProcessingId(id);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${API_BASE}/api/admin/verifications/${id}/completed-file`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                toast.success('File uploaded');
                setSelectedFiles((prev) => ({ ...prev, [id]: null }));
                return true;
            } else {
                const data = await res.json();
                toast.error(data.message || 'Upload failed');
                return false;
            }
        } catch {
            toast.error('Upload failed');
            return false;
        } finally {
            setProcessingId(null);
        }
    };

    const completeVerification = async (id: string) => {
        const selectedFile = selectedFiles[id] || null;
        const row = requests.find((r) => r.id === id);

        // Require either a newly selected file or an already uploaded completed file.
        if (!selectedFile && !row?.completedFile) {
            toast.error('Select a completed file before marking as completed');
            return;
        }

        if (selectedFile) {
            const uploaded = await uploadCompletedFile(id, selectedFile);
            if (!uploaded) return;
        }

        await updateStatus(id, 'COMPLETED');
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            req.companyName.toLowerCase().includes(search.toLowerCase()) ||
            req.studentName.toLowerCase().includes(search.toLowerCase()) ||
            req.usn.toLowerCase().includes(search.toLowerCase()) ||
            req.requestId.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const isCancelledRequest = (req: VerificationRequest) => {
        return req.status === 'REJECTED' && String(req.rejectionReason || '').toLowerCase().includes('cancelled by');
    };

    const getStatusLabel = (req: VerificationRequest) => {
        return isCancelledRequest(req) ? 'CANCELLED' : req.status;
    };

    const getStatusBadgeClass = (req: VerificationRequest) => {
        if (isCancelledRequest(req)) return 'border-slate-400 text-slate-700 bg-slate-100 font-bold tracking-wider';
        if (req.status === 'COMPLETED') return 'border-green-500 text-green-700 bg-green-50 font-bold tracking-wider';
        if (req.status === 'PROCESSING') return 'border-blue-500 text-blue-700 bg-blue-50 font-bold tracking-wider';
        if (req.status === 'REJECTED') return 'border-red-500 text-red-700 bg-red-50 font-bold tracking-wider';
        return 'border-yellow-500 text-yellow-700 bg-yellow-50 font-bold tracking-wider';
    };

    const getPaymentTextClass = (req: VerificationRequest) => {
        if (req.paymentStatus === 'REFUND_COMPLETED' || req.paymentStatus === 'REFUNDED') return 'font-bold text-emerald-700';
        if (req.paymentStatus === 'REFUND_INITIATED') return 'font-bold text-amber-700';
        if (req.paymentStatus === 'PAID') return 'font-bold text-green-700';
        return 'font-bold text-slate-700';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-lg text-white">
                <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-orange-400" />
                    <h1 className="text-xl font-bold tracking-tight">Company Verifications</h1>
                    <span className="text-sm text-slate-400">{requests.length} requests</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                        onClick={fetchRequests}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-800 p-3 rounded-lg text-slate-200">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Filter by Status:</span>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || 'ALL')}>
                        <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-slate-200 h-8">
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

                <div className="flex gap-4 text-xs font-semibold">
                    <span className="flex items-center text-yellow-500"><CheckCircle className="h-3 w-3 mr-1" /> PENDING: {requests.filter((r) => r.status === 'PENDING').length}</span>
                    <span className="flex items-center text-blue-500"><CheckCircle className="h-3 w-3 mr-1" /> PROCESSING: {requests.filter((r) => r.status === 'PROCESSING').length}</span>
                    <span className="flex items-center text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> COMPLETED: {requests.filter((r) => r.status === 'COMPLETED').length}</span>
                    <span className="flex items-center text-red-500"><XCircle className="h-3 w-3 mr-1" /> REJECTED: {requests.filter((r) => r.status === 'REJECTED').length}</span>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by Company or USN..."
                        className="pl-9 h-9 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden shadow-md border border-slate-200">
                <div className="overflow-x-auto w-full pb-2">
                    <Table className="w-full min-w-7xl text-sm">
                        <TableHeader className="bg-slate-900 border-b">
                            <TableRow className="hover:bg-slate-900 border-slate-700">
                                <TableHead className="min-w-48 whitespace-nowrap text-slate-200 font-semibold">Request</TableHead>
                                <TableHead className="min-w-56 whitespace-nowrap text-slate-200 font-semibold">Company</TableHead>
                                <TableHead className="min-w-52 whitespace-nowrap text-slate-200 font-semibold">Student</TableHead>
                                <TableHead className="min-w-36 whitespace-nowrap text-slate-200 font-semibold">Template</TableHead>
                                <TableHead className="min-w-36 whitespace-nowrap text-slate-200 font-semibold">Status</TableHead>
                                <TableHead className="min-w-32 whitespace-nowrap text-slate-200 font-semibold">Payment</TableHead>
                                <TableHead className="min-w-72 whitespace-nowrap text-slate-200 font-semibold">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading requests...</TableCell>
                                </TableRow>
                            ) : filteredRequests.map((req) => (
                                <TableRow key={req.id} className="hover:bg-slate-50 odd:bg-white even:bg-slate-50/50 align-top">
                                    <TableCell className="align-top py-3">
                                        <div className="font-semibold text-slate-900">{req.requestId}</div>
                                        <div className="text-xs text-slate-500">Applied: {new Date(req.createdAt).toLocaleDateString()}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <div className="font-medium text-slate-900">{req.companyName}</div>
                                        <div className="text-xs text-blue-700 break-all">{req.companyEmail}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <div className="font-medium text-slate-900">{req.studentName}</div>
                                        <div className="text-xs text-slate-600">USN: {req.usn}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-slate-700 border-slate-300 hover:bg-slate-50"
                                            onClick={() => downloadTemplate(req.id, req.requestId)}
                                        >
                                            <Download className="h-4 w-4 mr-2" /> Download
                                        </Button>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
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
                                    <TableCell className="align-top py-3 w-40 overflow-hidden">
                                        <div className={getPaymentTextClass(req)}>{req.paymentStatus}</div>
                                        <div className="mt-1 text-xs text-slate-500">Amount: Rs 5000.00</div>
                                        <div className="text-xs text-slate-400 truncate" title={req.paymentOrderId || 'N/A'}>Order ID: {req.paymentOrderId || 'N/A'}</div>
                                    </TableCell>
                                    <TableCell className="p-2 align-top min-w-72 overflow-hidden">
                                        <div className="flex w-68 flex-col gap-2">
                                            {!isCancelledRequest(req) ? (
                                                <>
                                                    <label className={`inline-flex items-center justify-center gap-2 h-8 px-3 rounded-md border text-sm ${req.status === 'COMPLETED' ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-300 bg-white cursor-pointer hover:bg-slate-50'}`}>
                                                        <Upload className="h-4 w-4" /> Select File
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                            disabled={processingId === req.id || req.status === 'COMPLETED' || req.status === 'REJECTED'}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0] || null;
                                                                setSelectedFiles((prev) => ({ ...prev, [req.id]: file }));
                                                            }}
                                                        />
                                                    </label>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-700 border-green-300 hover:bg-green-50"
                                                        onClick={() => completeVerification(req.id)}
                                                        disabled={
                                                            processingId === req.id ||
                                                            req.status === 'COMPLETED' ||
                                                            req.status === 'REJECTED' ||
                                                            (!selectedFiles[req.id] && !req.completedFile)
                                                        }
                                                    >
                                                        {processingId === req.id ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                                        Complete
                                                    </Button>

                                                    {selectedFiles[req.id] ? (
                                                        <p className="text-[11px] text-slate-600 break-all">Selected: {selectedFiles[req.id]?.name}</p>
                                                    ) : null}
                                                </>
                                            ) : (
                                                <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 wrap-break-word max-w-xs">
                                                    User cancelled this request. No further admin action is needed.
                                                </div>
                                            )}

                                            {req.status !== 'COMPLETED' && req.status !== 'REJECTED' ? (
                                                <div className="flex gap-2">
                                                    {rejectingId !== req.id && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
                                                            title="Reject Request"
                                                            onClick={() => { setRejectingId(req.id); setRejectionReason(''); }}
                                                            disabled={processingId === req.id}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : null}

                                            {rejectingId === req.id && req.status !== 'REJECTED' && req.status !== 'COMPLETED' && (
                                                <div className="border border-red-200 rounded-md p-2 bg-red-50 flex flex-col gap-2 mt-2">
                                                    <span className="text-[11px] text-red-700 font-semibold">Reason for rejection (required):</span>
                                                    <textarea
                                                        className="w-full text-xs border border-red-200 rounded p-1 resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                                                        rows={2}
                                                        placeholder="Enter reason..."
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="w-1/2 h-7 bg-red-600 hover:bg-red-700 text-white text-xs disabled:opacity-50"
                                                            disabled={processingId === req.id || !rejectionReason.trim()}
                                                            onClick={() => {
                                                                updateStatus(req.id, 'REJECTED', rejectionReason.trim());
                                                                setRejectingId(null);
                                                                setRejectionReason('');
                                                            }}
                                                        >
                                                            {processingId === req.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Confirm Reject'}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-1/2 h-7 text-xs"
                                                            onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {req.status === 'REJECTED' && req.paymentStatus === 'REFUND_INITIATED' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                                    disabled={processingId === req.id}
                                                    onClick={() => updateStatus(req.id, undefined, undefined, 'MARK_REFUND_COMPLETED')}
                                                >
                                                    Mark Refund Completed
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredRequests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">No verifications found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
