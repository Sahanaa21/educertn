"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { toast } from 'sonner';

type ReportStats = {
    totalCerts: number;
    pendingActions: number;
    totalVerifications: number;
    totalRevenue: number;
};

export default function AdminReportsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<ReportStats>({
        totalCerts: 0,
        pendingActions: 0,
        totalVerifications: 0,
        totalRevenue: 0,
    });

    const fetchStats = useCallback(async (showRefresh = false) => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
            return;
        }

        if (showRefresh) setRefreshing(true);

        try {
            const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    router.push('/admin/login');
                    return;
                }
                throw new Error('Failed to load report summary');
            }

            const data = await res.json();
            setStats(data?.stats || {});
        } catch {
            toast.error('Unable to load report summary');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    useEffect(() => {
        void fetchStats(false);
    }, [fetchStats]);

    const revenueLabel = useMemo(() => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(Number(stats.totalRevenue || 0));
    }, [stats.totalRevenue]);

    const exportSnapshotCsv = () => {
        const rows = [
            ['Metric', 'Value'],
            ['Total Certificate Requests', String(stats.totalCerts || 0)],
            ['Total Verification Requests', String(stats.totalVerifications || 0)],
            ['Pending Actions', String(stats.pendingActions || 0)],
            ['Collected Revenue (INR)', String(stats.totalRevenue || 0)],
            ['Generated At', new Date().toISOString()],
        ];

        const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `admin-report-snapshot-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading reports...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
                <div className="flex items-center gap-3">
                    <BarChart3 className="h-6 w-6 text-blue-700" />
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">Reports</h1>
                        <p className="text-sm text-slate-500">Generate official admin snapshots for operational reporting.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50" onClick={() => void fetchStats(true)}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button size="sm" className="bg-blue-700 hover:bg-blue-800" onClick={exportSnapshotCsv}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Certificate Requests</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-slate-900">{stats.totalCerts}</div></CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Verification Requests</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-slate-900">{stats.totalVerifications}</div></CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Pending Actions</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.pendingActions}</div>
                        <Badge variant="outline" className="mt-2 border-amber-500 bg-amber-50 text-amber-700">Requires review</Badge>
                    </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">Collected Revenue</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold text-slate-900">{revenueLabel}</div></CardContent>
                </Card>
            </div>
        </div>
    );
}
