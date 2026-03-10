"use client";

import { useState, useEffect } from 'react';
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

    const fetchRequests = async () => {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
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
    };

    useEffect(() => {
        fetchRequests();
    }, [router]);

    const updateStatus = async (id: string, status?: string, action?: string) => {
        setProcessingId(id);
        const token = localStorage.getItem('adminToken');
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
                body = JSON.stringify({ status, action });
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
        } catch (error) {
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
                req.stripeSessionId || 'N/A',
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-lg text-white">
                <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-orange-400" />
                    <h1 className="text-xl font-bold tracking-tight">Certificate Applications</h1>
                    <span className="text-sm text-slate-400">{requests.length} all applications</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700" onClick={handleExportCSV}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button variant="outline" size="sm" className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700" onClick={fetchRequests}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-800 p-3 rounded-lg text-slate-200">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Filter by Status:</span>
                    <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                        <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-slate-200 h-8">
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
                    <span className="flex items-center text-yellow-500"><CheckCircle className="h-3 w-3 mr-1" /> PENDING: {requests.filter(r => r.status === 'PENDING').length}</span>
                    <span className="flex items-center text-blue-500"><CheckCircle className="h-3 w-3 mr-1" /> PROCESSING: {requests.filter(r => r.status === 'PROCESSING').length}</span>
                    <span className="flex items-center text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> COMPLETED: {requests.filter(r => r.status === 'COMPLETED').length}</span>
                    <span className="flex items-center text-red-500"><XCircle className="h-3 w-3 mr-1" /> REJECTED: {requests.filter(r => r.status === 'REJECTED').length}</span>
                </div>
                <div className="ml-auto relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by USN or Name..."
                        className="pl-9 h-9 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden shadow-md border border-slate-200">
                <div className="w-full overflow-x-auto pb-2">
                    <Table className="w-full min-w-350 text-sm">
                        <TableHeader className="bg-slate-900 border-b">
                            <TableRow className="hover:bg-slate-900 border-slate-700">
                                <TableHead className="min-w-52 whitespace-nowrap text-slate-200 font-semibold">Request</TableHead>
                                <TableHead className="min-w-52 whitespace-nowrap text-slate-200 font-semibold">Student</TableHead>
                                <TableHead className="min-w-48 whitespace-nowrap text-slate-200 font-semibold">Certificate</TableHead>
                                <TableHead className="min-w-44 whitespace-nowrap text-slate-200 font-semibold">Delivery</TableHead>
                                <TableHead className="min-w-64 whitespace-nowrap text-slate-200 font-semibold">Contact</TableHead>
                                <TableHead className="min-w-36 whitespace-nowrap text-slate-200 font-semibold">Status</TableHead>
                                <TableHead className="min-w-48 whitespace-nowrap text-slate-200 font-semibold">Payment</TableHead>
                                <TableHead className="min-w-28 whitespace-nowrap text-slate-200 font-semibold">Document</TableHead>
                                <TableHead className="min-w-70 whitespace-nowrap text-slate-200 font-semibold">Action</TableHead>
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
                                    <TableCell className="whitespace-nowrap align-top py-3">
                                        <Badge variant="outline" className={
                                            req.status === 'COMPLETED' ? 'border-green-500 text-green-700 bg-green-50 font-bold tracking-wider' :
                                                req.status === 'PROCESSING' ? 'border-blue-500 text-blue-700 bg-blue-50 font-bold tracking-wider' :
                                                    req.status === 'REJECTED' ? 'border-red-500 text-red-700 bg-red-50 font-bold tracking-wider' :
                                                        'border-yellow-500 text-yellow-700 bg-yellow-50 font-bold tracking-wider'
                                        }>
                                            {req.status === 'PENDING' ? <CheckCircle className="w-3 h-3 mr-1 inline" /> : null}
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <div className="font-bold text-green-700">{req.paymentStatus}</div>
                                        <div className="text-xs text-slate-500">Amount: Rs {Number(req.amount || 0).toFixed(2)}</div>
                                        <div className="text-xs text-slate-400 truncate max-w-44">Payment ID: {req.stripeSessionId || 'txn_demo...'}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        {req.idProofUrl ? (
                                            <a href={`${API_BASE}${req.idProofUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center text-xs font-medium">
                                                <FileText className="w-3 h-3 mr-1" /> View
                                            </a>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell className="p-2 align-top min-w-70">
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

                                                    {!req.softCopyEmailed && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-1/2 text-red-600 border-red-200 hover:bg-red-50 font-medium disabled:opacity-50"
                                                            disabled={processingId === req.id}
                                                            onClick={() => updateStatus(req.id, 'REJECTED')}
                                                        >
                                                            {processingId === req.id ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                                            Reject
                                                        </Button>
                                                    )}
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
                                                <span className="text-xs font-semibold text-red-600 italic">Request Denied</span>
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
