"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CheckCircle, XCircle, Upload, Truck, Download, Printer, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

export default function AdminCertificates() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [uploadFiles, setUploadFiles] = useState<Record<string, File>>({});
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/certificates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            } else if (res.status === 401 || res.status === 403) {
                router.push('/admin/login');
            }
        } catch (error) {
            console.error('Failed to fetch certificates:', error);
            toast.error('Failed to load certificates');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const updateStatus = async (id: string, status?: string, action?: string, reason?: string) => {
        setProcessingId(id);
        const token = sessionStorage.getItem('adminToken');
        try {
            let body: any;
            let headers: any = {
                'Authorization': `Bearer ${token}`
            };

            const file = uploadFiles[id];
            if (action === 'UPLOAD_SOFT_COPY' && file) {
                const formData = new FormData();
                if (status) formData.append('status', status);
                formData.append('action', action);
                formData.append('file', file);
                body = formData;
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify({ status, action, rejectionReason: status === 'REJECTED' ? reason : undefined });
            }

            const res = await fetch(`${API_BASE}/api/admin/certificates/${id}/status`, {
                method: 'PUT',
                headers,
                body
            });

            if (res.ok) {
                toast.success('Status updated successfully');
                fetchRequests();
                if (action === 'UPLOAD_SOFT_COPY') {
                    setUploadFiles(prev => {
                        const newFiles = { ...prev };
                        delete newFiles[id];
                        return newFiles;
                    });
                }
            } else {
                toast.error('Failed to update status');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setProcessingId(null);
        }
    };

    const formatCertificateType = (value: string) => {
        return value
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const formatEnumLabel = (value: string) => {
        return String(value || '')
            .split('_')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    };

    const handleExportCSV = () => {
        if (requests.length === 0) return;

        const headers = ['ID', 'USN', 'Name', 'Branch', 'Year', 'Phone', 'Certificate Type', 'Copy Type', 'Copies', 'Email', 'Address', 'Reason', 'Status', 'Payment Status', 'Amount', 'Payment ID', 'Date Applied'];
        const csvRows = [headers.join(',')];

        filteredRequests.forEach(req => {
            const row = [
                req.id,
                req.usn,
                `"${req.studentName}"`,
                `"${req.branch}"`,
                req.yearOfPassing,
                req.phoneNumber || '',
                `"${formatCertificateType(req.certificateType)}"`,
                req.copyType,
                req.copies,
                req.user?.email || '',
                `"${req.address || ''}"`,
                `"${req.reason || ''}"`,
                req.status,
                req.paymentStatus,
                req.amount || 0,
                req.paymentOrderId || 'N/A',
                new Date(req.createdAt).toLocaleDateString()
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `certificate_requests_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.usn.toLowerCase().includes(search.toLowerCase()) ||
            req.studentName.toLowerCase().includes(search.toLowerCase()) ||
            req.id.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const toggleCompleteActions = (id: string) => {
        setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const extractDownloadName = (contentDisposition: string | null, fallbackName: string) => {
        if (!contentDisposition) return fallbackName;
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
        const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        return plainMatch?.[1] || fallbackName;
    };

    const downloadIdProof = async (id: string) => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/certificates/${id}/id-proof`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const raw = await res.text();
                let data: any = null;
                try {
                    data = raw ? JSON.parse(raw) : null;
                } catch {
                    data = null;
                }
                toast.error(data?.message || 'Unable to download uploaded file');
                return;
            }

            const blob = await res.blob();
            const fileName = extractDownloadName(res.headers.get('content-disposition'), `${id}-id-proof`);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Download failed');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:p-6">
                <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-700" />
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Certificate Applications</h1>
                    <span className="text-sm text-slate-500">{requests.length} paid applications</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50" onClick={handleExportCSV}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50" onClick={fetchRequests}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">Filter by Status:</span>
                    <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                        <SelectTrigger className="h-8 w-32 border-slate-300 bg-white text-slate-700">
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
                <div className="flex gap-4 text-xs font-semibold">
                    <span className="flex items-center text-yellow-500"><CheckCircle className="h-3 w-3 mr-1" /> PENDING: {requests.filter(r => r.status === 'PENDING').length}</span>
                    <span className="flex items-center text-blue-500"><CheckCircle className="h-3 w-3 mr-1" /> PROCESSING: {requests.filter(r => r.status === 'PROCESSING').length}</span>
                    <span className="flex items-center text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> COMPLETED: {requests.filter(r => r.status === 'COMPLETED').length}</span>
                    <span className="flex items-center text-red-500"><XCircle className="h-3 w-3 mr-1" /> REJECTED: {requests.filter(r => r.status === 'REJECTED').length}</span>
                </div>
                <div className="ml-auto relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by USN or Name..."
                        className="h-9 border-slate-300 bg-white pl-9 text-slate-700 placeholder:text-slate-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden shadow-md border border-slate-200">
                <div className="w-full overflow-x-auto pb-2">
                    <Table className="w-full min-w-350 text-sm">
                        <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                                <TableHead className="min-w-52 whitespace-nowrap font-semibold text-slate-700">Request</TableHead>
                                <TableHead className="min-w-52 whitespace-nowrap font-semibold text-slate-700">Student</TableHead>
                                <TableHead className="min-w-48 whitespace-nowrap font-semibold text-slate-700">Certificate</TableHead>
                                <TableHead className="min-w-44 whitespace-nowrap font-semibold text-slate-700">Delivery</TableHead>
                                <TableHead className="min-w-64 whitespace-nowrap font-semibold text-slate-700">Contact</TableHead>
                                <TableHead className="min-w-36 whitespace-nowrap font-semibold text-slate-700">Status</TableHead>
                                <TableHead className="min-w-48 whitespace-nowrap font-semibold text-slate-700">Payment</TableHead>
                                <TableHead className="min-w-28 whitespace-nowrap font-semibold text-slate-700">Document</TableHead>
                                <TableHead className="min-w-70 whitespace-nowrap font-semibold text-slate-700">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">Loading requests...</TableCell>
                                </TableRow>
                            ) : filteredRequests.map((req) => (
                                <TableRow key={req.id} className="hover:bg-slate-50 odd:bg-white even:bg-slate-50/50 align-top">
                                    <TableCell className="align-top py-3">
                                        <div className="font-semibold text-slate-900">{req.id}</div>
                                        <div className="text-xs text-slate-500">Applied: {new Date(req.createdAt).toLocaleDateString()}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <div className="font-medium text-slate-900">{req.studentName}</div>
                                        <div className="text-xs text-slate-600">USN: {req.usn}</div>
                                        <div className="text-xs text-slate-500">{req.branch} • {req.yearOfPassing}</div>
                                        <div className="text-xs text-slate-500">Phone: {req.phoneNumber || '—'}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <div className="text-sm font-medium text-slate-900">{formatCertificateType(req.certificateType)}</div>
                                        <div className="text-xs text-slate-500">Copies: {req.copies}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <div className="text-sm text-slate-800">{req.copyType.replace('_', ' ')}</div>
                                        <div className="mt-1 text-xs text-slate-600">
                                            <span className="font-medium text-slate-700">Address:</span>{' '}
                                            <span className="wrap-break-word">{req.address || 'Address not required'}</span>
                                        </div>
                                        <div className="mt-1 text-xs text-slate-600">
                                            <span className="font-medium text-slate-700">Reason:</span>{' '}
                                            <span className="wrap-break-word">{req.reason || 'No reason provided'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <div className="text-xs text-blue-700 break-all">{req.user?.email || '—'}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <div className="space-y-1">
                                            <Badge variant="outline" className={
                                                req.status === 'COMPLETED' ? 'border-green-500 text-green-700 bg-green-50 font-bold tracking-wider' :
                                                    req.status === 'PROCESSING' ? 'border-blue-500 text-blue-700 bg-blue-50 font-bold tracking-wider' :
                                                        req.status === 'REJECTED' ? 'border-red-500 text-red-700 bg-red-50 font-bold tracking-wider' :
                                                            'border-yellow-500 text-yellow-700 bg-yellow-50 font-bold tracking-wider'
                                            }>
                                                {req.status === 'PENDING' ? <CheckCircle className="w-3 h-3 mr-1 inline" /> : null}
                                                {req.status}
                                            </Badge>
                                            {req.status === 'REJECTED' && req.rejectionReason ? (
                                                <p className="max-w-65 whitespace-normal text-xs text-red-700">
                                                    Reason: {req.rejectionReason}
                                                </p>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-3 w-40 overflow-hidden">
                                        <div className={`font-bold ${req.paymentStatus === 'REFUND_INITIATED' ? 'text-amber-700' : req.paymentStatus === 'REFUND_COMPLETED' || req.paymentStatus === 'REFUNDED' ? 'text-emerald-700' : req.paymentStatus === 'PAID' ? 'text-green-700' : 'text-slate-700'}`}>{formatEnumLabel(req.paymentStatus)}</div>
                                        <div className="text-xs text-slate-500">Amount: Rs {Number(req.amount || 0).toFixed(2)}</div>
                                        <div className="text-xs text-slate-400 truncate" title={req.paymentOrderId || 'N/A'}>Order ID: {req.paymentOrderId || 'N/A'}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        {req.idProofUrl ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-800 border-blue-200"
                                                onClick={() => downloadIdProof(req.id)}
                                            >
                                                <FileText className="w-3 h-3 mr-1" /> Download
                                            </Button>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell className="p-2 align-top min-w-70 overflow-hidden">
                                        <div className="flex w-68 flex-col gap-2">
                                            {req.status !== 'COMPLETED' && req.status !== 'REJECTED' && (
                                                <div className="mb-2 flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-1/2 text-green-700 border-green-300 hover:bg-green-50 font-medium"
                                                        onClick={() => toggleCompleteActions(req.id)}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Complete
                                                    </Button>

                                                    {!req.softCopyEmailed && rejectingId !== req.id && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-1/2 text-red-600 border-red-200 hover:bg-red-50 font-medium disabled:opacity-50"
                                                            disabled={processingId === req.id}
                                                            onClick={() => { setRejectingId(req.id); setRejectionReason(''); }}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {rejectingId === req.id && req.status !== 'REJECTED' && req.status !== 'COMPLETED' && (
                                                <div className="border border-red-200 rounded-md p-2 bg-red-50 flex flex-col gap-2 mb-2">
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
                                                                updateStatus(req.id, 'REJECTED', undefined, rejectionReason.trim());
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

                                            {expandedRows[req.id] && req.status !== 'REJECTED' && req.status !== 'COMPLETED' && (
                                                <div className="flex flex-col gap-2">
                                                    {(req.copyType === 'SOFT_COPY' || req.copyType === 'BOTH') && !req.softCopyEmailed && (
                                                        <div className="border border-green-200 rounded-md p-2 bg-green-50 border-dashed flex flex-col items-center gap-2">
                                                            <span className="text-[10px] text-green-800 font-medium text-center">Attach file for email delivery:</span>
                                                            <label className="w-full h-7 text-green-700 border border-green-300 bg-white hover:bg-green-100 text-xs flex items-center justify-center cursor-pointer rounded-md overflow-hidden">
                                                                <span className="truncate px-2">{uploadFiles[req.id]?.name || '+ Choose file'}</span>
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    disabled={processingId === req.id}
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) {
                                                                            setUploadFiles(prev => ({ ...prev, [req.id]: e.target.files![0] }));
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="w-full h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs disabled:opacity-50"
                                                                disabled={processingId === req.id}
                                                                onClick={() => {
                                                                    if (!uploadFiles[req.id]) {
                                                                        toast.error('Please select a file first.');
                                                                        return;
                                                                    }
                                                                    updateStatus(req.id, undefined, 'UPLOAD_SOFT_COPY');
                                                                }}
                                                            >
                                                                {processingId === req.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                                                                {processingId === req.id ? 'Sending...' : 'Upload & Send Email'}
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {(req.copyType === 'HARD_COPY' || req.copyType === 'BOTH') && !req.physicalCopyPosted && (
                                                        <Button variant="default" size="sm" className="w-full h-8 bg-slate-900 hover:bg-slate-800 text-white text-xs mt-1 disabled:opacity-50" disabled={processingId === req.id} onClick={() => updateStatus(req.id, undefined, 'MARK_POSTED')}>
                                                            {processingId === req.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Truck className="h-3 w-3 mr-1" />}
                                                            {processingId === req.id ? 'Updating...' : 'Mark Physical Copy as Posted'}
                                                        </Button>
                                                    )}

                                                    {req.softCopyEmailed && (
                                                        <span className="text-[11px] text-blue-700 font-medium">Soft copy delivered.</span>
                                                    )}
                                                </div>
                                            )}

                                            {req.status === 'COMPLETED' && (
                                                <span className="text-xs font-semibold text-green-600 italic">Marked as Finalized</span>
                                            )}
                                            {req.status === 'REJECTED' && (
                                                <div className="space-y-2">
                                                    <div className="text-xs font-semibold text-red-600 italic wrap-break-word max-w-xs">
                                                        Request Denied
                                                        {req.rejectionReason ? `: ${req.rejectionReason}` : ''}
                                                    </div>
                                                    {req.paymentStatus === 'REFUND_INITIATED' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                                            disabled={processingId === req.id}
                                                            onClick={() => updateStatus(req.id, undefined, 'MARK_REFUND_COMPLETED')}
                                                        >
                                                            Mark Refund Completed
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && filteredRequests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">No applications matched your filters.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
