"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { API_BASE } from '@/lib/api';

export default function StudentRequests() {
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
                const res = await fetch(`${API_BASE}/api/student/certificates`, {
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
        return <div className="p-8 text-center text-slate-500">Loading your requests...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Requests</h1>
                <p className="text-slate-500 mt-1">View the history and status of all your certificate applications.</p>
            </div>

            <Card className="overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                                <TableHead>Request ID</TableHead>
                                <TableHead>Certificate Type</TableHead>
                                <TableHead>Mode/Copies</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date Applied</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium text-blue-600">{req.id}</TableCell>
                                    <TableCell>{req.certificateType.replace('_', ' ').toUpperCase()}</TableCell>
                                    <TableCell>{req.copyType.replace('_', ' ')} ({req.copies})</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            req.status === 'COMPLETED' ? 'border-green-500 text-green-700 bg-green-50' :
                                                req.status === 'PROCESSING' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                                    'border-yellow-500 text-yellow-700 bg-yellow-50'
                                        }>
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        {req.status === 'COMPLETED' && req.copyType.includes('SOFT') ? (
                                            <Button variant="outline" size="sm" className="hidden sm:inline-flex text-blue-600 border-blue-200">
                                                <Download className="h-4 w-4 mr-2" /> Download
                                            </Button>
                                        ) : (
                                            <Dialog>
                                                <DialogTrigger className="h-8 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors">
                                                    View Details
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>Request ID: {req.id}</DialogTitle>
                                                        <DialogDescription>Details of your certificate application.</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Certificate Type</p>
                                                                <p className="font-medium text-slate-900">{req.certificateType.replace('_', ' ').toUpperCase()}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Status</p>
                                                                <Badge variant="outline" className={
                                                                    req.status === 'COMPLETED' ? 'border-green-500 text-green-700 bg-green-50' :
                                                                        req.status === 'PROCESSING' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                                                            req.status === 'REJECTED' ? 'border-red-500 text-red-700 bg-red-50' :
                                                                                'border-yellow-500 text-yellow-700 bg-yellow-50'
                                                                }>
                                                                    {req.status}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Delivery Mode</p>
                                                                <p className="font-medium text-slate-900">{req.copyType.replace('_', ' ')}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Copies</p>
                                                                <p className="font-medium text-slate-900">{req.copies}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Amount Paid</p>
                                                                <p className="font-medium text-slate-900">₹ {req.amount}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Date Applied</p>
                                                                <p className="font-medium text-slate-900">{new Date(req.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        {(req.reason || req.address) && (
                                                            <div className="pt-4 border-t space-y-3">
                                                                {req.reason && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-500">Reason</p>
                                                                        <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded-md mt-1">{req.reason}</p>
                                                                    </div>
                                                                )}
                                                                {req.address && (
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-500">Delivery Address</p>
                                                                        <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded-md mt-1 leading-relaxed">{req.address}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {requests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No requests found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
