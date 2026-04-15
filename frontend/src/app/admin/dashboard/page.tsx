'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OpsMetrics {
    system: {
        uptime: number;
        nodeVersion: string;
        environment: string;
        timestamp: string;
    };
    health: {
        database: 'up' | 'down';
        databaseLatencyMs: number;
    };
    issues: {
        total: number;
        byCategory: Record<string, number>;
        byStatus: Record<string, number>;
        openCount: number;
    };
    requests: {
        certificateRequests: Record<'total' | 'pending' | 'completed' | 'rejected', number>;
        verificationRequests: Record<'total' | 'pending' | 'completed' | 'rejected', number>;
        academicServiceRequests: Record<'total' | 'pending' | 'completed' | 'rejected', number>;
    };
    recent: {
        issuesLast24h: number;
        requestsCompletedLast24h: number;
        errorsLogged: number;
    };
}

interface Issue {
    id: string;
    title: string;
    status: string;
    category: string;
    createdAt: string;
    reportedByEmail: string;
}

export default function OpsDashboardPage() {
    const [metrics, setMetrics] = useState<OpsMetrics | null>(null);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [metricsRes, issuesRes] = await Promise.all([
                apiFetch('/ops/metrics').then(r => r.json()),
                apiFetch('/ops/issues-summary').then(r => r.json()),
            ]);
            setMetrics(metricsRes);
            setIssues(issuesRes.issues);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load ops data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    if (loading && !metrics) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">Operations Dashboard</h1>
                    <p className="text-slate-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Operations Dashboard</h1>
                        <p className="text-slate-600 text-sm mt-1">
                            Last updated: {lastRefresh.toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400"
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {metrics && (
                    <>
                        {/* System Health */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Database</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-2xl font-bold">
                                                {metrics.health.database === 'up' ? '✓ UP' : '✗ DOWN'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {metrics.health.databaseLatencyMs}ms latency
                                            </p>
                                        </div>
                                        <div
                                            className={`w-3 h-3 rounded-full ${
                                                metrics.health.database === 'up' ? 'bg-green-500' : 'bg-red-500'
                                            }`}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">
                                        {Math.floor(metrics.system.uptime / 3600)} hours
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {metrics.system.environment} environment
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle>Open Issues</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{metrics.issues.openCount}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Total: {metrics.issues.total}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Issue Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Issues by Category</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {Object.entries(metrics.issues.byCategory).map(([category, count]) => (
                                            <div key={category} className="flex justify-between items-center">
                                                <span className="text-sm">{category}</span>
                                                <span className="font-semibold">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Request Throughput (24h)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Issues Reported</span>
                                            <span className="font-semibold">{metrics.recent.issuesLast24h}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">Requests Completed</span>
                                            <span className="font-semibold">{metrics.recent.requestsCompletedLast24h}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Request Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            {[
                                { name: 'Certificates', data: metrics.requests.certificateRequests },
                                { name: 'Verifications', data: metrics.requests.verificationRequests },
                                { name: 'Academic Services', data: metrics.requests.academicServiceRequests },
                            ].map((request) => (
                                <Card key={request.name}>
                                    <CardHeader>
                                        <CardTitle className="text-base">{request.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Total</span>
                                                <span className="font-semibold">{request.data.total}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Pending</span>
                                                <span className="font-semibold text-blue-600">{request.data.pending}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Completed</span>
                                                <span className="font-semibold text-green-600">{request.data.completed}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Rejected</span>
                                                <span className="font-semibold text-red-600">{request.data.rejected}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Recent Issues */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Issues</CardTitle>
                                <CardDescription>Last 10 reported issues</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {issues.length > 0 ? (
                                        issues.map((issue) => (
                                            <div
                                                key={issue.id}
                                                className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{issue.title}</p>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {issue.reportedByEmail} • {issue.category}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`px-2 py-1 text-xs rounded font-medium ${
                                                            issue.status === 'OPEN'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-slate-100 text-slate-700'
                                                        }`}
                                                    >
                                                        {issue.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500">No issues reported</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
