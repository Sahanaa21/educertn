"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiFetch, API_BASE } from '@/lib/api';

const STATUS_OPTIONS = ['PENDING', 'UNDER_REVIEW', 'RESULT_PUBLISHED', 'REJECTED'] as const;

type ServiceType = 'PHOTOCOPY' | 'REEVALUATION';

type RowState = {
    status: string;
    adminRemarks: string;
    resultSummary: string;
};

type Props = {
    serviceType: ServiceType;
    title: string;
    description: string;
};

const STATUS_LABELS: Record<ServiceType, Record<string, string>> = {
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
    if (status === 'RESULT_PUBLISHED') return 'border-green-500 text-green-700 bg-green-50';
    if (status === 'UNDER_REVIEW') return 'border-blue-500 text-blue-700 bg-blue-50';
    if (status === 'REJECTED') return 'border-red-500 text-red-700 bg-red-50';
    return 'border-amber-500 text-amber-700 bg-amber-50';
};

const parseAttachmentUrls = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    return [];
};

export default function AcademicServiceRequestsTable({ serviceType, title, description }: Props) {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const [rowState, setRowState] = useState<Record<string, RowState>>({});
    const [rowFiles, setRowFiles] = useState<Record<string, FileList | null>>({});
    const [photocopyFiles, setPhotocopyFiles] = useState<Record<string, { answerSheet: File | null; evaluationScheme: File | null }>>({});

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
            const res = await apiFetch(`/api/admin/academic-services?serviceType=${serviceType}`, {
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
                    status: item.status || 'PENDING',
                    adminRemarks: item.adminRemarks || '',
                    resultSummary: item.resultSummary || '',
                };
            }
            setRowState(initialState);
        } catch {
            toast.error(`Failed to load ${title.toLowerCase()} requests`);
        } finally {
            setLoading(false);
        }
    }, [serviceType, title, tokenOrRedirect]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const uploadFilesForRequest = async (id: string, token: string) => {
        const formData = new FormData();

        if (serviceType === 'PHOTOCOPY') {
            const selected = photocopyFiles[id];
            if (!selected?.answerSheet || !selected?.evaluationScheme) {
                toast.error('Select both answer sheet copy and course evaluation scheme files');
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
            for (const file of Array.from(files)) {
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

    const updateRequest = async (id: string) => {
        const token = tokenOrRedirect();
        if (!token) return;

        const state = rowState[id];
        const request = requests.find((item) => item.id === id);
        if (!state || !request) return;

        if (state.status === 'REJECTED' && !state.adminRemarks.trim()) {
            toast.error('Admin remarks are required for rejected requests');
            return;
        }

        if (serviceType === 'REEVALUATION' && state.status === 'RESULT_PUBLISHED' && !state.resultSummary.trim()) {
            toast.error('Result summary is required for re-evaluation when publishing result');
            return;
        }

        const currentAttachmentCount = parseAttachmentUrls(request.attachmentUrls).length;
        const hasBothFilesReady = serviceType === 'PHOTOCOPY'
            ? Boolean(photocopyFiles[id]?.answerSheet && photocopyFiles[id]?.evaluationScheme)
            : true;

        if (serviceType === 'PHOTOCOPY' && state.status === 'RESULT_PUBLISHED' && currentAttachmentCount < 2 && !hasBothFilesReady) {
            toast.error('Upload both answer sheet copy and course evaluation scheme before marking completed');
            return;
        }

        if (serviceType === 'PHOTOCOPY' && state.status === 'RESULT_PUBLISHED' && currentAttachmentCount < 2 && hasBothFilesReady) {
            const uploaded = await uploadFilesForRequest(id, token);
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
                    status: state.status,
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
            return matchesSearch && matchesStatus;
        });
    }, [requests, search, statusFilter]);

    const counts = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter((item) => item.status === 'PENDING').length,
            review: requests.filter((item) => item.status === 'UNDER_REVIEW').length,
            published: requests.filter((item) => item.status === 'RESULT_PUBLISHED').length,
            rejected: requests.filter((item) => item.status === 'REJECTED').length,
        };
    }, [requests]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading {title.toLowerCase()} requests...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
                <Button variant="outline" onClick={fetchData}>Refresh</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters and Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Input
                            placeholder="Search by request ID, student, semester"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || 'ALL')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All statuses</SelectItem>
                                {STATUS_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>{STATUS_LABELS[serviceType][option]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="text-sm text-slate-600 flex items-center">Showing {filteredRequests.length} of {counts.total} requests</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
                        <Badge variant="outline">Total: {counts.total}</Badge>
                        <Badge variant="outline">Pending: {counts.pending}</Badge>
                        <Badge variant="outline">Review: {counts.review}</Badge>
                        <Badge variant="outline">{serviceType === 'PHOTOCOPY' ? 'Completed' : 'Published'}: {counts.published}</Badge>
                        <Badge variant="outline">Rejected: {counts.rejected}</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{title} Table</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 pr-3">Request</th>
                                    <th className="py-2 pr-3">Student</th>
                                    <th className="py-2 pr-3">Details</th>
                                    <th className="py-2 pr-3">Payment</th>
                                    <th className="py-2 pr-3">Status</th>
                                    <th className="py-2 pr-3">Remarks</th>
                                    <th className="py-2 pr-3">Files</th>
                                    <th className="py-2 pr-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-6 text-center text-slate-500">No requests found.</td>
                                    </tr>
                                ) : filteredRequests.map((request) => {
                                    const current = rowState[request.id] || {
                                        status: request.status,
                                        adminRemarks: request.adminRemarks || '',
                                        resultSummary: request.resultSummary || '',
                                    };
                                    const attachments = parseAttachmentUrls(request.attachmentUrls);

                                    return (
                                        <tr key={request.id} className="border-b align-top">
                                            <td className="py-3 pr-3">
                                                <div className="font-semibold text-slate-900">{request.requestId}</div>
                                                <div className="text-xs text-slate-500">{new Date(request.createdAt).toLocaleString()}</div>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <div className="font-medium text-slate-900">{request.user?.name || 'Student'}</div>
                                                <div className="text-xs text-blue-700">{request.user?.email || '-'}</div>
                                            </td>
                                            <td className="py-3 pr-3 text-xs text-slate-700">
                                                <div>Semester: {request.semester}</div>
                                                <div>Courses: {request.courseCount}</div>
                                                <div className="max-w-xs break-words">{Array.isArray(request.courseNames) ? request.courseNames.join(', ') : '-'}</div>
                                            </td>
                                            <td className="py-3 pr-3 text-xs">
                                                <div className="font-semibold text-slate-800">{request.paymentStatus}</div>
                                                <div className="text-slate-500">Rs {Number(request.amount || 0).toFixed(2)}</div>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <div className="space-y-2">
                                                    <Badge variant="outline" className={badgeClass(request.status)}>
                                                        {STATUS_LABELS[serviceType][request.status] || request.status}
                                                    </Badge>
                                                    <Select
                                                        value={current.status}
                                                        onValueChange={(value) => {
                                                            const safeValue = value || 'PENDING';
                                                            setRowState((prev) => ({
                                                                ...prev,
                                                                [request.id]: {
                                                                    ...current,
                                                                    status: safeValue,
                                                                },
                                                            }));
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {STATUS_OPTIONS.map((option) => (
                                                                <SelectItem key={option} value={option}>{STATUS_LABELS[serviceType][option]}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3 min-w-[260px]">
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
                                                    />
                                                    {serviceType === 'REEVALUATION' ? (
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
                                                        />
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3 min-w-[280px]">
                                                <div className="space-y-2">
                                                    {serviceType === 'PHOTOCOPY' ? (
                                                        <>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">Answer Sheet Copy</Label>
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
                                                                <Label className="text-xs">Course Evaluation Scheme</Label>
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
                                                        <>
                                                            <Input
                                                                type="file"
                                                                multiple
                                                                onChange={(e) => setRowFiles((prev) => ({ ...prev, [request.id]: e.target.files }))}
                                                            />
                                                        </>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            const token = tokenOrRedirect();
                                                            if (!token) return;
                                                            void uploadFilesForRequest(request.id, token).then((uploaded) => {
                                                                if (uploaded) {
                                                                    void fetchData();
                                                                }
                                                            });
                                                        }}
                                                        disabled={uploadingId === request.id}
                                                    >
                                                        {uploadingId === request.id ? 'Uploading...' : 'Upload Files'}
                                                    </Button>

                                                    {attachments.length > 0 ? (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-slate-600">Uploaded files</p>
                                                            {attachments.map((url, idx) => (
                                                                <Link
                                                                    key={`${request.id}-file-${idx}`}
                                                                    href={`${API_BASE}${url}`}
                                                                    target="_blank"
                                                                    className="block text-xs text-blue-700 underline underline-offset-2"
                                                                >
                                                                    {serviceType === 'PHOTOCOPY' && idx === 0 ? 'Answer Sheet Copy' : serviceType === 'PHOTOCOPY' && idx === 1 ? 'Course Evaluation Scheme' : `Attachment ${idx + 1}`}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3">
                                                <div className="flex flex-col gap-2">
                                                    <Button size="sm" onClick={() => updateRequest(request.id)} disabled={updatingId === request.id}>
                                                        {updatingId === request.id ? 'Saving...' : 'Update Request'}
                                                    </Button>
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
                </CardContent>
            </Card>

            {serviceType === 'PHOTOCOPY' ? (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    Photocopy workflow: Pending to Processing / Under Review to Completed (after both required files are uploaded) or Rejected.
                </div>
            ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Re-evaluation workflow: Pending to Under Review to Result Published (with summary) or Rejected.
                </div>
            )}
        </div>
    );
}
