"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';

type SettingsState = {
    academicServicesEnabled: boolean;
    academicServicesStartAt: string;
    academicServicesEndAt: string;
    adminAllowedEmails: string;
};

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

export default function AdminAcademicServicesHubPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [settings, setSettings] = useState<SettingsState>({
        academicServicesEnabled: false,
        academicServicesStartAt: '',
        academicServicesEndAt: '',
        adminAllowedEmails: 'sahanaa2060@gmail.com',
    });

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
                    headers: { Authorization: `Bearer ${token}` },
                }),
                apiFetch('/api/admin/academic-services', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
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
                const list = await requestsRes.json();
                setRequests(Array.isArray(list) ? list : []);
            }
        } catch {
            toast.error('Failed to load academic services admin data');
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

        setSaving(true);
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
                    adminAllowedEmails: settings.adminAllowedEmails,
                }),
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
            setSaving(false);
        }
    };

    const summary = useMemo(() => {
        const photocopy = requests.filter((item) => item.serviceType === 'PHOTOCOPY');
        const reevaluation = requests.filter((item) => item.serviceType === 'REEVALUATION');
        return {
            total: requests.length,
            photocopy: photocopy.length,
            reevaluation: reevaluation.length,
        };
    }, [requests]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading academic services admin panel...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Academic Services</h1>
                <p className="text-sm text-slate-500">Use separate pages for Photocopy and Re-evaluation tables.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Service Tables</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/admin/academic-services/photocopy" className="rounded-md border p-4 hover:bg-slate-50 transition-colors">
                        <p className="font-semibold text-slate-900">Photocopy Requests</p>
                        <p className="text-sm text-slate-500 mt-1">Manage pending, processing and completed photocopy requests.</p>
                        <Badge variant="outline" className="mt-2">Total: {summary.photocopy}</Badge>
                    </Link>
                    <Link href="/admin/academic-services/re-evaluation" className="rounded-md border p-4 hover:bg-slate-50 transition-colors">
                        <p className="font-semibold text-slate-900">Re-evaluation Requests</p>
                        <p className="text-sm text-slate-500 mt-1">Manage under review and result published re-evaluation requests.</p>
                        <Badge variant="outline" className="mt-2">Total: {summary.reevaluation}</Badge>
                    </Link>
                    <div className="md:col-span-2">
                        <Badge variant="outline">All Academic Service Requests: {summary.total}</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Window and Access Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Admin Allowed Emails</Label>
                            <Textarea
                                value={settings.adminAllowedEmails}
                                onChange={(e) => setSettings((prev) => ({ ...prev, adminAllowedEmails: e.target.value }))}
                                rows={3}
                                placeholder="coe@gat.ac.in, principal@gat.ac.in"
                            />
                            <p className="text-xs text-slate-500">Separate multiple emails with commas or new lines.</p>
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
                    <Button onClick={saveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save Window Settings'}</Button>
                </CardContent>
            </Card>
        </div>
    );
}
