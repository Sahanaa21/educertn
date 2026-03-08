"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StudentDashboard() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/student/login');
                return;
            }

            try {
                const res = await fetch('http://localhost:5000/api/student/certificates', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setRequests(data);
                } else {
                    if (res.status === 401) {
                        localStorage.removeItem('token');
                        router.push('/student/login');
                    }
                }
            } catch (err) {
                console.error("Error fetching requests", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [router]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading your profile...</div>;
    }

    const pendingCount = requests.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING').length;
    const completedCount = requests.filter(r => r.status === 'COMPLETED').length;
    const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-1">Welcome back. Here is an overview of your certificate requests.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-t-4 border-t-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Requests</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{requests.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-yellow-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{pendingCount}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Completed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{completedCount}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-red-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{rejectedCount}</div>
                    </CardContent>
                </Card>
            </div>

            {requests.length === 0 ? (
                <Card className="bg-slate-50 border-dashed border-2 p-8 text-center flex flex-col items-center justify-center">
                    <FileText className="h-12 w-12 text-slate-300 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-700">No requests yet</h2>
                    <p className="text-slate-500 mt-2 max-w-sm mb-6">You haven't applied for any certificates or documents yet.</p>
                    <Button onClick={() => router.push('/student/apply')} size="lg" className="bg-blue-600 hover:bg-blue-700">
                        Apply for a Certificate Now
                    </Button>
                </Card>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Applications</h2>
                        <Button onClick={() => router.push('/student/apply')} variant="outline" size="sm">
                            New Request
                        </Button>
                    </div>
                    <Card className="overflow-hidden shadow-sm">
                        <div className="overflow-x-auto w-full">
                            <Table>
                                <TableHeader className="bg-slate-50 border-b">
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Request ID</TableHead>
                                        <TableHead className="whitespace-nowrap">Certificate Type</TableHead>
                                        <TableHead className="whitespace-nowrap">Mode</TableHead>
                                        <TableHead className="whitespace-nowrap">Payment</TableHead>
                                        <TableHead className="whitespace-nowrap">Status</TableHead>
                                        <TableHead className="whitespace-nowrap">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium text-blue-600 whitespace-nowrap">{req.id}</TableCell>
                                            <TableCell className="whitespace-nowrap">{req.certificateType.replace('_', ' ').toUpperCase()}</TableCell>
                                            <TableCell className="whitespace-nowrap">{req.copyType.replace('_', ' ')} ({req.copies})</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <Badge variant={req.paymentStatus === 'PAID' ? 'default' : 'secondary'} className={req.paymentStatus === 'PAID' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none'}>
                                                    {req.paymentStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <Badge variant="outline" className={
                                                    req.status === 'COMPLETED' ? 'border-green-500 text-green-700 bg-green-50' :
                                                        req.status === 'PROCESSING' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                                            req.status === 'REJECTED' ? 'border-red-500 text-red-700 bg-red-50' :
                                                                'border-yellow-500 text-yellow-700 bg-yellow-50'
                                                }>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
