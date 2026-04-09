"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquareWarning, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

type IssueReport = {
    id: string;
    title: string;
    description: string;
    category: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    tags?: string[];
    duplicateOfId?: string | null;
    pageUrl: string | null;
    reportedByName: string | null;
    reportedByEmail: string | null;
    role: string | null;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    adminNotes: string | null;
    createdAt: string;
};

const STATUS_OPTIONS: IssueReport['status'][] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminIssuesPage() {
    const router = useRouter();
    const [issues, setIssues] = useState<IssueReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchIssues = useCallback(async () => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin/login');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/issues`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setIssues(await res.json());
            } else if (res.status === 401 || res.status === 403) {
                router.push('/admin/login');
            } else {
                toast.error('Failed to load issue reports');
            }
        } catch {
            toast.error('Network error while loading issue reports');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    const updateIssueStatus = async (id: string, status: IssueReport['status']) => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) return;

        setProcessingId(id);
        try {
            const res = await fetch(`${API_BASE}/api/admin/issues/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                toast.success(`Issue marked as ${status}`);
                fetchIssues();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to update issue status');
            }
        } catch {
            toast.error('Network error while updating issue');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredIssues = issues.filter((issue) => {
        const key = search.toLowerCase();
        const matchesSearch =
            issue.title.toLowerCase().includes(key) ||
            issue.description.toLowerCase().includes(key) ||
            (issue.priority || '').toLowerCase().includes(key) ||
            (issue.tags || []).join(' ').toLowerCase().includes(key) ||
            (issue.reportedByEmail || '').toLowerCase().includes(key) ||
            (issue.reportedByName || '').toLowerCase().includes(key);
        const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getPriorityClasses = (priority: IssueReport['priority']) => {
        if (priority === 'CRITICAL') return 'border-red-600 text-red-700 bg-red-50';
        if (priority === 'HIGH') return 'border-orange-500 text-orange-700 bg-orange-50';
        if (priority === 'MEDIUM') return 'border-amber-500 text-amber-700 bg-amber-50';
        return 'border-slate-400 text-slate-700 bg-slate-100';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg bg-slate-900 p-4 text-white">
                <div className="flex items-center gap-3">
                    <MessageSquareWarning className="h-6 w-6 text-orange-400" />
                    <h1 className="text-xl font-bold tracking-tight">Issue Reports</h1>
                    <span className="text-sm text-slate-400">{issues.length} reports</span>
                </div>
                <Button variant="outline" size="sm" className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700" onClick={fetchIssues}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-800 p-3 rounded-lg text-slate-200">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Filter by Status:</span>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || 'ALL')}>
                        <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-slate-200 h-8">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-slate-200 border-slate-700">
                            <SelectItem value="ALL">All</SelectItem>
                            {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="ml-auto relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search reports..."
                        className="pl-9 h-9 bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="overflow-hidden border border-slate-200 shadow-md">
                <div className="w-full overflow-x-auto pb-2">
                    <Table className="w-full min-w-7xl text-sm">
                        <TableHeader className="bg-slate-900 border-b">
                            <TableRow className="hover:bg-slate-900 border-slate-700">
                                <TableHead className="min-w-56 whitespace-nowrap text-slate-200 font-semibold">Issue</TableHead>
                                <TableHead className="min-w-44 whitespace-nowrap text-slate-200 font-semibold">Priority / Tags</TableHead>
                                <TableHead className="min-w-44 whitespace-nowrap text-slate-200 font-semibold">Reporter</TableHead>
                                <TableHead className="min-w-40 whitespace-nowrap text-slate-200 font-semibold">Category</TableHead>
                                <TableHead className="min-w-40 whitespace-nowrap text-slate-200 font-semibold">Status</TableHead>
                                <TableHead className="min-w-44 whitespace-nowrap text-slate-200 font-semibold">Page</TableHead>
                                <TableHead className="min-w-36 whitespace-nowrap text-slate-200 font-semibold">Date</TableHead>
                                <TableHead className="min-w-72 whitespace-nowrap text-slate-200 font-semibold">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-slate-500">Loading reports...</TableCell>
                                </TableRow>
                            ) : filteredIssues.map((issue) => (
                                <TableRow key={issue.id} className="hover:bg-slate-50 odd:bg-white even:bg-slate-50/50 align-top">
                                    <TableCell className="align-top py-3">
                                        <div className="font-semibold text-slate-900">{issue.title}</div>
                                        <div className="mt-1 text-xs text-slate-600 wrap-break-word">{issue.description}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <Badge variant="outline" className={`font-semibold tracking-wide ${getPriorityClasses(issue.priority)}`}>
                                            {issue.priority || 'LOW'}
                                        </Badge>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {(issue.tags || []).length > 0 ? (issue.tags || []).map((tag) => (
                                                <Badge key={`${issue.id}-${tag}`} variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-[11px]">
                                                    {tag}
                                                </Badge>
                                            )) : (
                                                <span className="text-xs text-slate-400">No tags</span>
                                            )}
                                        </div>
                                        {issue.duplicateOfId ? (
                                            <div className="mt-2 text-xs text-rose-700">
                                                Possible duplicate of: <span className="font-semibold">{issue.duplicateOfId}</span>
                                            </div>
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="align-top py-3">
                                        <div className="text-sm text-slate-900">{issue.reportedByName || 'Anonymous'}</div>
                                        <div className="text-xs text-blue-700 break-all">{issue.reportedByEmail || 'Email not provided'}</div>
                                        <div className="text-xs text-slate-500">Role: {issue.role || 'Unknown'}</div>
                                    </TableCell>
                                    <TableCell className="align-top py-3 text-slate-700">{issue.category}</TableCell>
                                    <TableCell className="align-top py-3">
                                        <Badge variant="outline" className={
                                            issue.status === 'RESOLVED' ? 'border-green-500 text-green-700 bg-green-50 font-bold tracking-wider' :
                                                issue.status === 'IN_PROGRESS' ? 'border-blue-500 text-blue-700 bg-blue-50 font-bold tracking-wider' :
                                                    issue.status === 'CLOSED' ? 'border-slate-500 text-slate-700 bg-slate-100 font-bold tracking-wider' :
                                                        'border-yellow-500 text-yellow-700 bg-yellow-50 font-bold tracking-wider'
                                        }>
                                            {issue.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="align-top py-3 text-xs text-slate-600">{issue.pageUrl || 'N/A'}</TableCell>
                                    <TableCell className="align-top py-3 text-xs text-slate-600">{new Date(issue.createdAt).toLocaleString()}</TableCell>
                                    <TableCell className="p-2 align-top min-w-72">
                                        <div className="flex w-68 flex-col gap-2">
                                            <Select
                                                value={issue.status}
                                                onValueChange={(value) => updateIssueStatus(issue.id, value as IssueReport['status'])}
                                                disabled={processingId === issue.id}
                                            >
                                                <SelectTrigger className="h-8">
                                                    <SelectValue placeholder="Update status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {STATUS_OPTIONS.map((status) => (
                                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && filteredIssues.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-slate-500">No issue reports found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
