"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Eye, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminVerifications() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchRequests = async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/admin/verifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            } else if (res.status === 401 || res.status === 403) {
                router.push('/admin/login');
            }
        } catch (error) {
            console.error('Failed to fetch verifications:', error);
            toast.error('Failed to load verifications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [router]);

    const updateStatus = async (id: string, status: string) => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`http://localhost:5000/api/admin/verifications/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                toast.success(`Request marked as ${status}`);
                fetchRequests();
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            toast.error('Network error');
        }
    };

    const filteredRequests = requests.filter(req =>
        req.companyName.toLowerCase().includes(search.toLowerCase()) ||
        req.studentName.toLowerCase().includes(search.toLowerCase()) ||
        req.usn.toLowerCase().includes(search.toLowerCase()) ||
        req.id.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading requests...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Verifications</h1>
                    <p className="text-slate-500 mt-1">Manage and respond to background check requests.</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search by Company or USN..."
                        className="pl-9 h-10 border-slate-300"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden shadow-sm border-t-4 border-t-purple-600">
                <div className="overflow-x-auto w-full">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                                <TableHead className="whitespace-nowrap">ID / Date</TableHead>
                                <TableHead className="whitespace-nowrap">Agency / Company</TableHead>
                                <TableHead className="whitespace-nowrap">Candidate</TableHead>
                                <TableHead className="whitespace-nowrap">Target Type</TableHead>
                                <TableHead className="whitespace-nowrap">Payment</TableHead>
                                <TableHead className="whitespace-nowrap">Status</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRequests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="whitespace-nowrap">
                                        <div className="font-medium text-slate-900">{req.id}</div>
                                        <div className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <div className="font-medium">{req.companyName}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <div className="font-medium">{req.studentName}</div>
                                        <div className="text-xs text-slate-500">{req.usn} · {req.branch}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <div>{req.verificationType.replace('_', ' ').toUpperCase()}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <Badge variant={req.paymentStatus === 'PAID' ? 'default' : 'secondary'} className={req.paymentStatus === 'PAID' ? 'bg-green-600' : 'bg-slate-200 text-slate-700'}>
                                            {req.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <Badge variant="outline" className={
                                            req.status === 'COMPLETED' ? 'border-green-500 text-green-700 bg-green-50' :
                                                req.status === 'REJECTED' ? 'border-red-500 text-red-700 bg-red-50' :
                                                    'border-yellow-500 text-yellow-700 bg-yellow-50'
                                        }>
                                            {req.status === 'COMPLETED' ? 'VERIFIED' : req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-2">
                                            {req.status === 'PENDING' && req.paymentStatus === 'PAID' && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-green-600 hover:bg-green-50" title="Verify & Complete" onClick={() => updateStatus(req.id, 'COMPLETED')}>
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" title="Reject Request" onClick={() => updateStatus(req.id, 'REJECTED')}>
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredRequests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">No verifications found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
