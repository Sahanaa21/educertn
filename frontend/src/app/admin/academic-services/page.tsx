"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';

type SettingsState = {
    academicServicesEnabled: boolean;
    academicServicesStartAt: string;
    academicServicesEndAt: string;
    adminAllowedEmails: string;
};

const STATUS_OPTIONS = ['PENDING', 'UNDER_REVIEW', 'RESULT_PUBLISHED', 'REJECTED'] as const;

const toLocalInputDateTime = (value: string | null | undefined) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const tzOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
};

const fromLocalInputDateTime = (value: string) => {
    if (!value) return null;
    return new Date(value).toISOString();
};

export default function AdminAcademicServicesPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [savingSettings, setSavingSettings] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [settings, setSettings] = useState<SettingsState>({
        academicServicesEnabled: false,
        academicServicesStartAt: '',
        academicServicesEndAt: '',
        adminAllowedEmails: 'sahanaa2060@gmail.com',
    });
    const [rowState, setRowState] = useState<Record<string, { status: string; adminRemarks: string; resultSummary: string }>>({});
    const [rowFiles, setRowFiles] = useState<Record<string, FileList | null>>({});

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
            const [settingsRes, requestsRes] = await Promise.all([
                apiFetch('/api/admin/academic-services/settings', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                apiFetch('/api/admin/academic-services', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (settingsRes.ok) {
                const settingsJson = await settingsRes.json();
                setSettings({
                    academicServicesEnabled: Boolean(settingsJson.academicServicesEnabled),
                    academicServicesStartAt: toLocalInputDateTime(settingsJson.academicServicesStartAt),
                    academicServicesEndAt: toLocalInputDateTime(settingsJson.academicServicesEndAt),
                    adminAllowedEmails: String(settingsJson.adminAllowedEmails || 'sahanaa2060@gmail.com'),
                });
            }

            if (requestsRes.ok) {
                const requestsJson = await requestsRes.json();
                const list = Array.isArray(requestsJson) ? requestsJson : [];
                setRequests(list);

                const initialState: Record<string, { status: string; adminRemarks: string; resultSummary: string }> = {};
                for (const item of list) {
                    initialState[item.id] = {
                        status: item.status || 'PENDING',
                        adminRemarks: item.adminRemarks || '',
                        resultSummary: item.resultSummary || '',
                    };
                }
                setRowState(initialState);
            }
        } catch {
            toast.error('Failed to load academic service admin data');
        } finally {
            setLoading(false);
        }
    }, [tokenOrRedirect]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const saveSettings = async () => {
        const token = tokenOrRedirect();
        if (!token) return;

        setSavingSettings(true);
        try {
            const res = await apiFetch('/api/admin/academic-services/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    academicServicesEnabled: settings.academicServicesEnabled,
                    academicServicesStartAt: fromLocalInputDateTime(settings.academicServicesStartAt),
                    academicServicesEndAt: fromLocalInputDateTime(settings.academicServicesEndAt),
                })
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                toast.error(json?.message || 'Failed to save settings');
                return;
            }

            toast.success('Settings updated');
            await fetchData();
        } catch {
            toast.error('Network error while saving settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const updateRequest = async (id: string) => {
        const token = tokenOrRedirect();
        if (!token) return;

        const state = rowState[id];
        if (!state) return;

        if (state.status === 'REJECTED' && !state.adminRemarks.trim()) {
            toast.error('Admin remarks are mandatory for rejected requests');
            return;
        }

        if (state.status === 'RESULT_PUBLISHED' && !state.resultSummary.trim()) {
            toast.error('Result summary is mandatory when publishing results');
            return;
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
                })
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
                body: JSON.stringify({ action: 'MARK_REFUND_COMPLETED' })
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

    const uploadAttachments = async (id: string) => {
        const token = tokenOrRedirect();
        if (!token) return;

        const files = rowFiles[id];
        if (!files || files.length === 0) {
            toast.error('Select one or more files first');
            return;
        }

        const formData = new FormData();
        for (const file of Array.from(files)) {
            formData.append('files', file);
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
                toast.error(json?.message || 'Failed to upload attachments');
                return;
            }

            toast.success('Attachments uploaded');
            await fetchData();
        } catch {
            toast.error('Network error while uploading attachments');
        } finally {
            setUploadingId(null);
        }
    };

    const summary = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter((item) => item.status === 'PENDING').length,
            underReview: requests.filter((item) => item.status === 'UNDER_REVIEW').length,
            published: requests.filter((item) => item.status === 'RESULT_PUBLISHED').length,
            rejected: requests.filter((item) => item.status === 'REJECTED').length,
        };
    }, [requests]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading academic services admin panel...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Academic Services</h1>
                <p className="text-sm text-slate-500">Manage photocopy and challenge re-evaluation requests.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Window and Access Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Admin Allowed Email</Label>
                            <Input value={settings.adminAllowedEmails} readOnly />
                        </div>
                        <div className="flex items-center gap-2 pt-7">
                            <input
                                type="checkbox"
                                checked={settings.academicServicesEnabled}
                                onChange={(e) => setSettings((prev) => ({ ...prev, academicServicesEnabled: e.target.checked }))}
                                className="h-4 w-4"
                            />
                            <span className="text-sm">Enable academic services</span>
                        </div>
                        <div className="space-y-2">
                            <Label>Start Date and Time</Label>
                            <Input
                                type="datetime-local"
                                value={settings.academicServicesStartAt}
                                onChange={(e) => setSettings((prev) => ({ ...prev, academicServicesStartAt: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date and Time</Label>
                            <Input
                                type="datetime-local"
                                value={settings.academicServicesEndAt}
                                onChange={(e) => setSettings((prev) => ({ ...prev, academicServicesEndAt: e.target.value }))}
                            />
                        </div>
                    </div>
                    <Button onClick={saveSettings} disabled={savingSettings}>
                        {savingSettings ? 'Saving...' : 'Save Window Settings'}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Request Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                    <Badge variant="outline">Total: {summary.total}</Badge>
                    <Badge variant="outline">Pending: {summary.pending}</Badge>
                    <Badge variant="outline">Review: {summary.underReview}</Badge>
                    <Badge variant="outline">Published: {summary.published}</Badge>
                    <Badge variant="outline">Rejected: {summary.rejected}</Badge>
                </CardContent>
            </Card>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Rejected requests require admin remarks. Published results require a result summary and are allowed only for paid requests.
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {requests.length === 0 ? (
                            <p className="text-sm text-slate-500">No requests found.</p>
                        ) : requests.map((request) => {
                            const current = rowState[request.id] || {
                                status: request.status,
                                adminRemarks: request.adminRemarks || '',
                                resultSummary: request.resultSummary || '',
                            };

                            return (
                                <div key={request.id} className="rounded-md border p-4 space-y-3">
                                    <div className="flex flex-wrap gap-2 items-center text-sm">
                                        <span className="font-semibold">{request.requestId}</span>
                                        <Badge variant="outline">{request.serviceType}</Badge>
                                        <Badge variant="outline">{request.status}</Badge>
                                        <Badge variant="outline">Payment: {request.paymentStatus}</Badge>
                                        <span className="text-slate-500">{request.user?.email || 'Unknown student'}</span>
                                    </div>

                                    <div className="text-sm text-slate-600">
                                        Semester: {request.semester} | Courses: {request.courseCount} | Amount: Rs {Number(request.amount || 0).toFixed(2)}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-2">
                                            <Label>Status</Label>
                                            <Select
                                                value={current.status}
                                                onValueChange={(value) => {
                                                    const safeValue = value || 'PENDING';
                                                    setRowState((prev) => ({
                                                        ...prev,
                                                        [request.id]: {
                                                            ...current,
                                                            status: safeValue,
                                                        }
                                                    }));
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {STATUS_OPTIONS.map((option) => (
                                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Admin Remarks</Label>
                                            <Textarea
                                                value={current.adminRemarks}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setRowState((prev) => ({
                                                        ...prev,
                                                        [request.id]: {
                                                            ...current,
                                                            adminRemarks: value,
                                                        }
                                                    }));
                                                }}
                                                rows={2}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-3">
                                            <Label>Result Summary</Label>
                                            <Textarea
                                                value={current.resultSummary}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setRowState((prev) => ({
                                                        ...prev,
                                                        [request.id]: {
                                                            ...current,
                                                            resultSummary: value,
                                                        }
                                                    }));
                                                }}
                                                rows={2}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" onClick={() => updateRequest(request.id)} disabled={updatingId === request.id}>
                                            {updatingId === request.id ? 'Saving...' : 'Update Request'}
                                        </Button>
                                        {request.paymentStatus === 'REFUND_INITIATED' ? (
                                            <Button size="sm" variant="outline" onClick={() => markRefundCompleted(request.id)} disabled={updatingId === request.id}>
                                                Mark Refund Completed
                                            </Button>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Upload Attachment Files (optional)</Label>
                                        <Input
                                            type="file"
                                            multiple
                                            onChange={(e) => setRowFiles((prev) => ({ ...prev, [request.id]: e.target.files }))}
                                        />
                                        <Button size="sm" variant="outline" onClick={() => uploadAttachments(request.id)} disabled={uploadingId === request.id}>
                                            {uploadingId === request.id ? 'Uploading...' : 'Upload Attachments'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
