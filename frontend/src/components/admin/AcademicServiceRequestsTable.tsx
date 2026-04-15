"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiFetch, API_BASE } from '@/lib/api';
import { RefreshCw, Search, FileText, CheckCircle, XCircle } from 'lucide-react';

type ServiceType = 'PHOTOCOPY' | 'REEVALUATION' | 'ALL';

type RowState = {
    adminRemarks: string;
    resultSummary: string;
};

type Props = {
    initialServiceFilter?: ServiceType;
    title: string;
    description: string;
};

const STATUS_LABELS: Record<'PHOTOCOPY' | 'REEVALUATION', Record<string, string>> = {
    PHOTOCOPY: {
        PENDING: 'Pending',
        UNDER_REVIEW: 'Processing / Under Review',
        RESULT_PUBLISHED: 'Completed',
        REJECTED: 'Rejected',
    },
    REEVALUATION: {
        PENDING: 'Pending',
        UNDER_REVIEW: 'Under Review',
        RESULT_PUBLISHED: 'Result Published',
        REJECTED: 'Rejected',
    },
};

const badgeClass = (status: string) => {
    if (status === 'RESULT_PUBLISHED') return 'border-green-500 text-green-700 bg-green-50 font-bold tracking-wider';
    if (status === 'UNDER_REVIEW') return 'border-blue-500 text-blue-700 bg-blue-50 font-bold tracking-wider';
    if (status === 'REJECTED') return 'border-red-500 text-red-700 bg-red-50 font-bold tracking-wider';
    return 'border-amber-500 text-amber-700 bg-amber-50 font-bold tracking-wider';
};

const parseAttachmentUrls = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    return [];
};

export default function AcademicServiceRequestsTable({ initialServiceFilter = 'ALL', title, description }: Props) {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [serviceFilter, setServiceFilter] = useState<ServiceType>(initialServiceFilter);

    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const [rowState, setRowState] = useState<Record<string, RowState>>({});
    const [rowFiles, setRowFiles] = useState<Record<string, FileList | null>>({});
    const [photocopyFiles, setPhotocopyFiles] = useState<Record<string, { answerSheet: File | null; evaluationScheme: File | null }>>({});
    const [expandedFilesId, setExpandedFilesId] = useState<string | null>(null);

    const tokenOrRedirect = useCallback(() => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
            return null;
        }
        return token;
    }, [router]);

    const fetchData = useCallback(async () => {
        const token = tokenOrRedirect();
        if (!token) return;

        setLoading(true);
        try {
            const res = await apiFetch('/api/admin/academic-services', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error('Failed to load requests');
            }

            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setRequests(list);

            const initialState: Record<string, RowState> = {};
            for (const item of list) {
                initialState[item.id] = {
                    adminRemarks: item.adminRemarks || '',
                    resultSummary: item.resultSummary || '',
                };
            }
            setRowState(initialState);
        } catch {
            toast.error('Failed to load academic service requests');
        } finally {
            setLoading(false);
        }
    }, [tokenOrRedirect]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const uploadFilesForRequest = async (id: string, token: string, request: any) => {
        if (request?.status === 'RESULT_PUBLISHED' || request?.status === 'REJECTED') {
            toast.error('Cannot upload files for completed or rejected requests');
            return false;
        }

        const formData = new FormData();

        if (request?.serviceType === 'PHOTOCOPY') {
            const selected = photocopyFiles[id];
            if (!selected?.answerSheet || !selected?.evaluationScheme) {
                toast.error('Select both answer sheet copy and course evaluation scheme files');
                return false;
            }
            if (selected.answerSheet.size <= 0 || selected.evaluationScheme.size <= 0) {
                toast.error('Selected files are invalid. Please reselect the files.');
                return false;
            }
            formData.append('files', selected.answerSheet);
            formData.append('files', selected.evaluationScheme);
        } else {
            const files = rowFiles[id];
            if (!files || files.length === 0) {
                toast.error('Select one or more files first');
                return false;
            }
            const selected = Array.from(files).filter((file) => file.size > 0);
            if (selected.length === 0) {
                toast.error('Selected files are invalid. Please choose valid files.');
                return false;
            }
            for (const file of selected) {
                formData.append('files', file);
            }
        }

        setUploadingId(id);
        try {
            const res = await apiFetch(`/api/admin/academic-services/${id}/attachments`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(json?.message || 'Failed to upload files');
                return false;
            }

            toast.success('Files uploaded');
            return true;
        } catch {
            toast.error('Network error while uploading files');
            return false;
        } finally {
            setUploadingId(null);
        }
    };

    const updateRequestStatus = async (id: string, nextStatus: 'PENDING' | 'UNDER_REVIEW' | 'RESULT_PUBLISHED' | 'REJECTED') => {
        const token = tokenOrRedirect();
        if (!token) return;

        const state = rowState[id];
        const request = requests.find((item) => item.id === id);
        if (!state || !request) return;

        if (nextStatus === 'REJECTED' && !state.adminRemarks.trim()) {
            toast.error('Admin remarks are required for rejected requests');
            return;
        }

        if (request.serviceType === 'REEVALUATION' && nextStatus === 'RESULT_PUBLISHED' && !state.resultSummary.trim()) {
            toast.error('Result summary is required for re-evaluation when publishing result');
            return;
        }

        const currentAttachmentCount = parseAttachmentUrls(request.attachmentUrls).length;
        const hasBothFilesReady = request.serviceType === 'PHOTOCOPY'
            ? Boolean(photocopyFiles[id]?.answerSheet && photocopyFiles[id]?.evaluationScheme)
            : true;

        if (request.serviceType === 'PHOTOCOPY' && nextStatus === 'RESULT_PUBLISHED' && currentAttachmentCount < 2 && !hasBothFilesReady) {
            toast.error('Upload both answer sheet copy and course evaluation scheme before marking completed');
            return;
        }

        if (request.serviceType === 'PHOTOCOPY' && nextStatus === 'RESULT_PUBLISHED' && currentAttachmentCount < 2 && hasBothFilesReady) {
            const uploaded = await uploadFilesForRequest(id, token, request);
            if (!uploaded) return;
        }

        setUpdatingId(id);
        try {
            const res = await apiFetch(`/api/admin/academic-services/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: nextStatus,
                    adminRemarks: state.adminRemarks,
                    resultSummary: state.resultSummary,
                }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(json?.message || 'Failed to update request');
                return;
            }

            toast.success('Request updated');
            await fetchData();
        } catch {
            toast.error('Network error while updating request');
        } finally {
            setUpdatingId(null);
        }
    };

    const markRefundCompleted = async (id: string) => {
        const token = tokenOrRedirect();
        if (!token) return;

        setUpdatingId(id);
        try {
            const res = await apiFetch(`/api/admin/academic-services/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ action: 'MARK_REFUND_COMPLETED' }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(json?.message || 'Failed to mark refund completed');
                return;
            }

            toast.success('Refund marked as completed');
            await fetchData();
        } catch {
            toast.error('Network error while updating refund');
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredRequests = useMemo(() => {
        return requests.filter((item) => {
            const q = search.trim().toLowerCase();
            const matchesSearch = !q
                || String(item.requestId || '').toLowerCase().includes(q)
                || String(item.user?.email || '').toLowerCase().includes(q)
                || String(item.user?.name || '').toLowerCase().includes(q)
                || String(item.semester || '').toLowerCase().includes(q);
            const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
            const matchesService = serviceFilter === 'ALL' || item.serviceType === serviceFilter;
            return matchesSearch && matchesStatus && matchesService;
        });
    }, [requests, search, statusFilter, serviceFilter]);

    const counts = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter((item) => item.status === 'PENDING').length,
            review: requests.filter((item) => item.status === 'UNDER_REVIEW').length,
            completedOrPublished: requests.filter((item) => item.status === 'RESULT_PUBLISHED').length,
            rejected: requests.filter((item) => item.status === 'REJECTED').length,
            photocopy: requests.filter((item) => item.serviceType === 'PHOTOCOPY').length,
            reevaluation: requests.filter((item) => item.serviceType === 'REEVALUATION').length,
        };
    }, [requests]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading {title.toLowerCase()} requests...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:p-6">
                <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-700" />
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
                        <p className="text-xs text-slate-500">{description}</p>
                    </div>
                    <span className="text-sm text-slate-500">{filteredRequests.length} requests</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50" onClick={fetchData}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:flex-row xl:items-center">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">Service:</span>
                    <Select value={serviceFilter} onValueChange={(value) => setServiceFilter((value as ServiceType) || 'ALL')}>
                        <SelectTrigger className="h-8 w-44 border-slate-300 bg-white text-slate-700">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-200 bg-white text-slate-700">
                            <SelectItem value="ALL">All</SelectItem>
                            <SelectItem value="PHOTOCOPY">Photocopy</SelectItem>
                            <SelectItem value="REEVALUATION">Re-evaluation</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">Status:</span>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || 'ALL')}>
                        <SelectTrigger className="h-8 w-44 border-slate-300 bg-white text-slate-700">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-200 bg-white text-slate-700">
                            <SelectItem value="ALL">All</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                            <SelectItem value="RESULT_PUBLISHED">Completed / Result Published</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-semibold">
                    <span className="flex items-center text-yellow-500"><CheckCircle className="h-3 w-3 mr-1" /> PENDING: {counts.pending}</span>
                    <span className="flex items-center text-blue-500"><CheckCircle className="h-3 w-3 mr-1" /> REVIEW: {counts.review}</span>
                    <span className="flex items-center text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> COMPLETED/PUBLISHED: {counts.completedOrPublished}</span>
                    <span className="flex items-center text-red-500"><XCircle className="h-3 w-3 mr-1" /> REJECTED: {counts.rejected}</span>
                </div>

                <div className="text-xs font-semibold text-slate-600">PHOTOCOPY: {counts.photocopy} | RE-EVALUATION: {counts.reevaluation}</div>

                <div className="xl:ml-auto relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by ID, student, semester"
                        className="h-9 border-slate-300 bg-white pl-9 text-slate-700 placeholder:text-slate-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden border border-slate-200 shadow-md">
                <div className="w-full overflow-x-auto pb-2">
                        <table className="w-full min-w-375 table-fixed text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="w-40 px-3 py-3 text-left font-semibold text-slate-700">Request</th>
                                    <th className="w-30 px-3 py-3 text-left font-semibold text-slate-700">Service</th>
                                    <th className="w-47.5 px-3 py-3 text-left font-semibold text-slate-700">Student</th>
                                    <th className="w-42.5 px-3 py-3 text-left font-semibold text-slate-700">Details</th>
                                    <th className="w-30 px-3 py-3 text-left font-semibold text-slate-700">Payment</th>
                                    <th className="w-37.5 px-3 py-3 text-left font-semibold text-slate-700">Status</th>
                                    <th className="w-42.5 px-3 py-3 text-left font-semibold text-slate-700">Remarks</th>
                                    <th className="w-60 px-3 py-3 text-left font-semibold text-slate-700">Files</th>
                                    <th className="w-40 px-3 py-3 text-left font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-6 text-center text-slate-500">No requests found.</td>
                                    </tr>
                                ) : filteredRequests.map((request) => {
                                    const rowServiceType = request.serviceType === 'PHOTOCOPY' ? 'PHOTOCOPY' : 'REEVALUATION';
                                    const current = rowState[request.id] || {
                                        adminRemarks: request.adminRemarks || '',
                                        resultSummary: request.resultSummary || '',
                                    };
                                    const attachments = parseAttachmentUrls(request.attachmentUrls);

                                    return (
                                        <tr key={request.id} className="hover:bg-slate-50 odd:bg-white even:bg-slate-50/50 border-b align-top">
                                            <td className="px-3 py-3 align-top">
                                                <div className="font-semibold text-slate-900">{request.requestId}</div>
                                                <div className="text-xs text-slate-500">{new Date(request.createdAt).toLocaleString()}</div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <Badge variant="outline" className={rowServiceType === 'PHOTOCOPY' ? 'border-sky-500 text-sky-700 bg-sky-50' : 'border-violet-500 text-violet-700 bg-violet-50'}>
                                                    {rowServiceType === 'PHOTOCOPY' ? 'Photocopy' : 'Re-evaluation'}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="font-medium text-slate-900">{request.user?.name || 'Student'}</div>
                                                <div className="truncate text-xs text-blue-700">{request.user?.email || '-'}</div>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-slate-700 align-top">
                                                <div>Semester: {request.semester}</div>
                                                <div>Courses: {request.courseCount}</div>
                                                <div className="truncate">{Array.isArray(request.courseNames) ? request.courseNames.join(', ') : '-'}</div>
                                            </td>
                                            <td className="px-3 py-3 text-xs align-top">
                                                <div className="font-semibold text-slate-800">{request.paymentStatus}</div>
                                                <div className="text-slate-500">Rs {Number(request.amount || 0).toFixed(2)}</div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="space-y-2">
                                                    <Badge variant="outline" className={badgeClass(request.status)}>
                                                        {STATUS_LABELS[rowServiceType][request.status] || request.status}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="space-y-2">
                                                    <Textarea
                                                        value={current.adminRemarks}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            setRowState((prev) => ({
                                                                ...prev,
                                                                [request.id]: {
                                                                    ...current,
                                                                    adminRemarks: value,
                                                                },
                                                            }));
                                                        }}
                                                        rows={2}
                                                        placeholder="Admin remarks"
                                                        disabled={request.status === 'RESULT_PUBLISHED' || request.status === 'REJECTED'}
                                                    />
                                                    {rowServiceType === 'REEVALUATION' ? (
                                                        <Textarea
                                                            value={current.resultSummary}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setRowState((prev) => ({
                                                                    ...prev,
                                                                    [request.id]: {
                                                                        ...current,
                                                                        resultSummary: value,
                                                                    },
                                                                }));
                                                            }}
                                                            rows={2}
                                                            placeholder="Result summary (required for result published)"
                                                            disabled={request.status === 'RESULT_PUBLISHED' || request.status === 'REJECTED'}
                                                        />
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                    <button
                                                        type="button"
                                                        className="text-xs font-semibold text-blue-700 underline underline-offset-2"
                                                        onClick={() => setExpandedFilesId((prev) => prev === request.id ? null : request.id)}
                                                    >
                                                        {expandedFilesId === request.id ? 'Hide uploaded files' : 'Click to view uploaded files'}
                                                    </button>

                                                    {expandedFilesId === request.id ? (
                                                        <div className="mt-3 space-y-3">
                                                            {request.status === 'RESULT_PUBLISHED' || request.status === 'REJECTED' ? (
                                                                <div className="space-y-1">
                                                                    {attachments.length > 0 ? attachments.map((url, idx) => (
                                                                        <a
                                                                            key={`${request.id}-file-${idx}`}
                                                                            href={`${API_BASE}${url}`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="block rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-blue-700 underline underline-offset-2 hover:border-blue-200 hover:bg-blue-50"
                                                                        >
                                                                            {rowServiceType === 'PHOTOCOPY' && idx === 0 ? 'Answer Sheet Copy' : rowServiceType === 'PHOTOCOPY' && idx === 1 ? 'Course Evaluation Scheme' : `Attachment ${idx + 1}`}
                                                                        </a>
                                                                    )) : (
                                                                        <p className="text-xs text-slate-500">No files were uploaded for this request.</p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="space-y-2">
                                                                        {rowServiceType === 'PHOTOCOPY' ? (
                                                                            <>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-xs text-slate-600">Answer Sheet Copy</Label>
                                                                                    <Input
                                                                                        type="file"
                                                                                        onChange={(e) => {
                                                                                            const file = e.target.files?.[0] || null;
                                                                                            setPhotocopyFiles((prev) => ({
                                                                                                ...prev,
                                                                                                [request.id]: {
                                                                                                    answerSheet: file,
                                                                                                    evaluationScheme: prev[request.id]?.evaluationScheme || null,
                                                                                                },
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-xs text-slate-600">Course Evaluation Scheme</Label>
                                                                                    <Input
                                                                                        type="file"
                                                                                        onChange={(e) => {
                                                                                            const file = e.target.files?.[0] || null;
                                                                                            setPhotocopyFiles((prev) => ({
                                                                                                ...prev,
                                                                                                [request.id]: {
                                                                                                    answerSheet: prev[request.id]?.answerSheet || null,
                                                                                                    evaluationScheme: file,
                                                                                                },
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <div className="space-y-1">
                                                                                <Label className="text-xs text-slate-600">Attachments</Label>
                                                                                <Input
                                                                                    type="file"
                                                                                    multiple
                                                                                    onChange={(e) => setRowFiles((prev) => ({ ...prev, [request.id]: e.target.files }))}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            const token = tokenOrRedirect();
                                                                            if (!token) return;
                                                                            void uploadFilesForRequest(request.id, token, request).then((uploaded) => {
                                                                                if (uploaded) {
                                                                                    void fetchData();
                                                                                }
                                                                            });
                                                                        }}
                                                                        disabled={uploadingId === request.id}
                                                                    >
                                                                        {uploadingId === request.id ? 'Uploading...' : 'Upload Files'}
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="flex flex-col gap-2">
                                                    {request.status === 'PENDING' ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-blue-700 border-blue-300 hover:bg-blue-50"
                                                            onClick={() => updateRequestStatus(request.id, 'UNDER_REVIEW')}
                                                            disabled={updatingId === request.id}
                                                        >
                                                            {updatingId === request.id ? 'Updating...' : (rowServiceType === 'PHOTOCOPY' ? 'Mark Processing' : 'Mark Under Review')}
                                                        </Button>
                                                    ) : null}

                                                    {request.status === 'UNDER_REVIEW' ? (
                                                        <Button
                                                            size="sm"
                                                            className="bg-slate-900 hover:bg-slate-800 text-white"
                                                            onClick={() => updateRequestStatus(request.id, 'RESULT_PUBLISHED')}
                                                            disabled={updatingId === request.id}
                                                        >
                                                            {updatingId === request.id ? 'Updating...' : (rowServiceType === 'PHOTOCOPY' ? 'Mark Completed' : 'Publish Result')}
                                                        </Button>
                                                    ) : null}

                                                    {(request.status === 'PENDING' || request.status === 'UNDER_REVIEW') ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-700 border-red-300 hover:bg-red-50"
                                                            onClick={() => updateRequestStatus(request.id, 'REJECTED')}
                                                            disabled={updatingId === request.id || !current.adminRemarks.trim()}
                                                        >
                                                            {updatingId === request.id ? 'Updating...' : 'Reject'}
                                                        </Button>
                                                    ) : null}

                                                    {request.status === 'RESULT_PUBLISHED' ? (
                                                        <span className="text-xs font-semibold text-green-700">Completed</span>
                                                    ) : null}

                                                    {request.status === 'REJECTED' ? (
                                                        <span className="text-xs font-semibold text-red-700">Rejected</span>
                                                    ) : null}

                                                    {request.paymentStatus === 'REFUND_INITIATED' ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => markRefundCompleted(request.id)}
                                                            disabled={updatingId === request.id}
                                                        >
                                                            Mark Refund Completed
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                </div>
            </Card>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Photocopy requests require both files before marking Completed. Re-evaluation requests require result summary before Result Published.
                Use Admin Remarks before clicking Reject.
            </div>
        </div>
    );
}
