"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import AcademicServiceRequestsTable from '@/components/admin/AcademicServiceRequestsTable';
import { FileText, CheckCircle, Clock3, XCircle } from 'lucide-react';

type SettingsState = {
    academicServicesEnabled: boolean;
    academicServicesStartAt: string;
    academicServicesEndAt: string;
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
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<SettingsState>({
        academicServicesEnabled: false,
        academicServicesStartAt: '',
        academicServicesEndAt: '',
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
            const settingsRes = await apiFetch('/api/admin/academic-services/settings', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (settingsRes.ok) {
                const settingsJson = await settingsRes.json();
                setSettings({
                    academicServicesEnabled: Boolean(settingsJson.academicServicesEnabled),
                    academicServicesStartAt: toLocalInputDateTime(settingsJson.academicServicesStartAt),
                    academicServicesEndAt: toLocalInputDateTime(settingsJson.academicServicesEndAt),
                });
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

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading academic services admin panel...</div>;
    }

    const serviceTypeParam = String(searchParams.get('serviceType') || '').toUpperCase();
    const initialServiceFilter = serviceTypeParam === 'PHOTOCOPY' || serviceTypeParam === 'REEVALUATION'
        ? serviceTypeParam
        : 'ALL';

    const summaryCards = [
        { label: 'Total Requests', value: 'All academic requests', icon: FileText, tone: 'text-blue-700 bg-blue-50 border-blue-200' },
        { label: 'Active Window', value: settings.academicServicesEnabled ? 'Enabled' : 'Disabled', icon: CheckCircle, tone: settings.academicServicesEnabled ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-700 bg-slate-100 border-slate-200' },
        { label: 'Window Start', value: settings.academicServicesStartAt || 'Not set', icon: Clock3, tone: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
        { label: 'Window End', value: settings.academicServicesEndAt || 'Not set', icon: XCircle, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
    ];

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h1 className="text-2xl font-bold text-slate-900">Academic Services</h1>
                <p className="text-sm text-slate-500">Photocopy and re-evaluation workflows with service-window controls.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.label} className="border border-slate-200 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">{card.label}</CardTitle>
                                <span className={`inline-flex rounded-full border p-2 ${card.tone}`}>
                                    <Icon className="h-4 w-4" />
                                </span>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-semibold text-slate-900">{card.value}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <AcademicServiceRequestsTable
                title="Academic Services"
                description="Manage both Photocopy and Re-evaluation requests in one smart table."
                initialServiceFilter={initialServiceFilter as 'ALL' | 'PHOTOCOPY' | 'REEVALUATION'}
            />

            <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle>Service Window</CardTitle>
                    <Badge variant="outline" className={settings.academicServicesEnabled ? 'border-green-500 text-green-700 bg-green-50' : 'border-slate-400 text-slate-700 bg-slate-100'}>
                        {settings.academicServicesEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        Academic services are controlled here only. Admin email governance lives in the Settings page.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <Label htmlFor="academicServicesEnabled" className="text-sm font-medium text-slate-700">Academic Services Status</Label>
                                    <p className="mt-1 text-xs text-slate-500">Turn the academic services module on or off.</p>
                                </div>
                                <Button
                                    id="academicServicesEnabled"
                                    type="button"
                                    variant="outline"
                                    className={settings.academicServicesEnabled ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}
                                    onClick={() => setSettings((prev) => ({ ...prev, academicServicesEnabled: !prev.academicServicesEnabled }))}
                                >
                                    {settings.academicServicesEnabled ? 'Enabled' : 'Disabled'}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="academicServicesStartAt">Start Date and Time</Label>
                            <Input
                                id="academicServicesStartAt"
                                type="datetime-local"
                                value={settings.academicServicesStartAt}
                                onChange={(e) => setSettings((prev) => ({ ...prev, academicServicesStartAt: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="academicServicesEndAt">End Date and Time</Label>
                            <Input
                                id="academicServicesEndAt"
                                type="datetime-local"
                                value={settings.academicServicesEndAt}
                                onChange={(e) => setSettings((prev) => ({ ...prev, academicServicesEndAt: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={saveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save Window Settings'}</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
