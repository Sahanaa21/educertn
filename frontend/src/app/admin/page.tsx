"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Building2, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCerts: 0,
        pendingActions: 0,
        totalVerifications: 0
    });
    const [recentCertificates, setRecentCertificates] = useState<any[]>([]);
    const [recentVerifications, setRecentVerifications] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                router.push('/admin/login');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats);
                    setRecentCertificates(data.recentCertificates);
                    setRecentVerifications(data.recentVerifications);
                } else if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('adminToken');
                    router.push('/admin/login');
                }
            } catch (error) {
                console.error('Failed to fetch admin dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [router]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
                    <p className="text-slate-500 mt-1">Overview of all system activities and pending requests.</p>
                </div>
                <Button variant="outline" onClick={() => {
                    localStorage.removeItem('adminToken');
                    router.push('/admin/login');
                }}>Logout</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-t-4 border-t-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Cert Requests</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.totalCerts}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-yellow-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Pending Actions</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.pendingActions}</div>
                        <p className="text-xs text-slate-500 mt-1">Requires immediate review</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-purple-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Verification Requests</CardTitle>
                        <Building2 className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.totalVerifications}</div>
                    </CardContent>
                </Card>
            </div>

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
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentCertificates.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium text-slate-900">{req.usn}</TableCell>
                                            <TableCell className="text-slate-600 whitespace-nowrap">{req.certificateType.replace('_', ' ').toUpperCase()}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={req.status === 'COMPLETED' ? 'border-green-500 text-green-700 bg-green-50' : req.status === 'REJECTED' ? 'border-red-500 text-red-700 bg-red-50' : 'border-yellow-500 text-yellow-700 bg-yellow-50'}>
                                                    {req.status}
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
                                            <TableCell colSpan={4} className="text-center py-4 text-slate-500">No requests.</TableCell>
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
                                                <Badge variant="outline" className={req.status === 'COMPLETED' ? 'border-green-500 text-green-700 bg-green-50' : req.status === 'REJECTED' ? 'border-red-500 text-red-700 bg-red-50' : 'border-yellow-500 text-yellow-700 bg-yellow-50'}>
                                                    {req.status}
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
                                            <TableCell colSpan={4} className="text-center py-4 text-slate-500">No verifications.</TableCell>
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
