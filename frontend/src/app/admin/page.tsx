"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Building2, AlertCircle, IndianRupee, RefreshCw, ClipboardList, Settings } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

type DashboardStats = {
    totalCerts: number;
    pendingActions: number;
    totalVerifications: number;
    totalRevenue?: number;
};

type CertificateRow = {
    id: string;
    usn: string;
    certificateType: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
};

type VerificationRow = {
    id: string;
    requestId: string;
    companyName: string;
    studentName: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
};

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<DashboardStats>({
        totalCerts: 0,
        pendingActions: 0,
        totalVerifications: 0,
        totalRevenue: 0,
    });
    const [recentCertificates, setRecentCertificates] = useState<CertificateRow[]>([]);
    const [recentVerifications, setRecentVerifications] = useState<VerificationRow[]>([]);

    const formatEnumLabel = (value: string) => {
        return String(value || '')
            .split('_')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    };

    const getStatusClass = (status: string) => {
        if (status === 'COMPLETED' || status === 'RESULT_PUBLISHED') return 'border-green-500 text-green-700 bg-green-50';
        if (status === 'PROCESSING' || status === 'UNDER_REVIEW') return 'border-blue-500 text-blue-700 bg-blue-50';
        if (status === 'REJECTED') return 'border-red-500 text-red-700 bg-red-50';
        return 'border-amber-500 text-amber-700 bg-amber-50';
    };

    const getPaymentClass = (paymentStatus: string) => {
        if (paymentStatus === 'PAID') return 'border-green-500 text-green-700 bg-green-50';
        if (paymentStatus === 'REFUND_INITIATED') return 'border-amber-500 text-amber-700 bg-amber-50';
        if (paymentStatus === 'REFUND_COMPLETED' || paymentStatus === 'REFUNDED') return 'border-emerald-500 text-emerald-700 bg-emerald-50';
        if (paymentStatus === 'FAILED') return 'border-red-500 text-red-700 bg-red-50';
        return 'border-slate-400 text-slate-700 bg-slate-100';
    };

    const fetchDashboardData = useCallback(async (showRefreshState = false) => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
            return;
        }

        if (showRefreshState) setRefreshing(true);

        try {
            const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setStats(data.stats || {});
                setRecentCertificates(Array.isArray(data.recentCertificates) ? data.recentCertificates : []);
                setRecentVerifications(Array.isArray(data.recentVerifications) ? data.recentVerifications : []);
            } else if (res.status === 401 || res.status === 403) {
                sessionStorage.removeItem('adminToken');
                router.push('/admin/login');
            }
        } catch (error) {
            console.error('Failed to fetch admin dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    useEffect(() => {
        void fetchDashboardData(false);
    }, [fetchDashboardData]);

    const revenueLabel = useMemo(() => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(Number(stats.totalRevenue || 0));
    }, [stats.totalRevenue]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading admin dashboard...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
                    <p className="mt-1 text-slate-500">Operations overview, revenue snapshot, and latest processing queues.</p>
                </div>
                <Button variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50" onClick={() => void fetchDashboardData(true)}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Cert Requests</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.totalCerts}</div>
                    </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Pending Actions</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.pendingActions}</div>
                        <p className="text-xs text-slate-500 mt-1">Requires immediate review</p>
                    </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Verification Requests</CardTitle>
                        <Building2 className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.totalVerifications}</div>
                    </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Collected Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{revenueLabel}</div>
                        <p className="mt-1 text-xs text-slate-500">From paid certificate and verification requests</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-900">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Button variant="outline" className="justify-start border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => router.push('/admin/certificates')}>
                            <ClipboardList className="mr-2 h-4 w-4" /> Process Certificates
                        </Button>
                        <Button variant="outline" className="justify-start border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => router.push('/admin/verifications')}>
                            <Building2 className="mr-2 h-4 w-4" /> Process Verifications
                        </Button>
                        <Button variant="outline" className="justify-start border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => router.push('/admin/academic-services')}>
                            <FileText className="mr-2 h-4 w-4" /> Academic Services Queue
                        </Button>
                        <Button variant="outline" className="justify-start border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => router.push('/admin/settings')}>
                            <Settings className="mr-2 h-4 w-4" /> Portal Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Certificates</h2>
                        <Link href="/admin/certificates" className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">View All</Link>
                    </div>
                    <Card className="overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 border-b">
                                    <TableRow>
                                        <TableHead>USN</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentCertificates.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium text-slate-900">{req.usn}</TableCell>
                                            <TableCell className="text-slate-600 whitespace-nowrap">{formatEnumLabel(req.certificateType)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getPaymentClass(req.paymentStatus)}>
                                                    {formatEnumLabel(req.paymentStatus)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusClass(req.status)}>
                                                    {formatEnumLabel(req.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => router.push('/admin/certificates')}>
                                                    Review
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {recentCertificates.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4 text-slate-500">No certificate requests available.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Verifications</h2>
                        <Link href="/admin/verifications" className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">View All</Link>
                    </div>
                    <Card className="overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 border-b">
                                    <TableRow>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentVerifications.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium text-slate-900 whitespace-nowrap">{req.companyName}</TableCell>
                                            <TableCell className="text-slate-600 whitespace-nowrap">{req.studentName}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getPaymentClass(req.paymentStatus)}>
                                                    {formatEnumLabel(req.paymentStatus)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusClass(req.status)}>
                                                    {formatEnumLabel(req.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => router.push('/admin/verifications')}>
                                                    Verify
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {recentVerifications.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4 text-slate-500">No verification requests available.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
