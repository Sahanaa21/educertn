"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileBarChart2, FileSpreadsheet } from 'lucide-react';
import { API_BASE } from '@/lib/api';

type Certificate = { id: string; usn: string; status: string; paymentStatus: string; createdAt: string; amount: number; certificateType: string };
type Verification = { id: string; requestId: string; companyName: string; studentName: string; usn: string; status: string; paymentStatus: string; createdAt: string };

function exportCsv(filename: string, rows: Record<string, string | number>[]) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => `"${String(row[h]).replaceAll('"', '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [verifications, setVerifications] = useState<Verification[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const token = sessionStorage.getItem('adminToken');
            if (!token) {
                router.push('/admin/login');
                return;
            }

            try {
                const [certRes, verRes] = await Promise.all([
                    fetch(`${API_BASE}/api/admin/certificates`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API_BASE}/api/admin/verifications`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                if (certRes.ok) setCertificates(await certRes.json());
                if (verRes.ok) setVerifications(await verRes.json());
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const summary = useMemo(() => {
        return {
            totalCertificates: certificates.length,
            totalVerifications: verifications.length,
            completedCertificates: certificates.filter((c) => c.status === 'COMPLETED').length,
            completedVerifications: verifications.filter((v) => v.status === 'COMPLETED').length,
            pendingCertificates: certificates.filter((c) => c.status === 'PENDING' || c.status === 'PROCESSING').length,
            pendingVerifications: verifications.filter((v) => v.status === 'PENDING' || v.status === 'PROCESSING').length,
        };
    }, [certificates, verifications]);

    if (loading) return <div className="p-6 text-slate-500">Loading reports...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
                    <p className="text-slate-500">Operational snapshot and downloadable report exports.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => exportCsv('certificate-requests-report.csv', certificates.map((c) => ({
                            id: c.id,
                            usn: c.usn,
                            certificateType: c.certificateType,
                            status: c.status,
                            paymentStatus: c.paymentStatus,
                            amount: c.amount,
                            createdAt: new Date(c.createdAt).toISOString(),
                        })))}
                    >
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Certificate CSV
                    </Button>
                    <Button
                        onClick={() => exportCsv('verification-requests-report.csv', verifications.map((v) => ({
                            id: v.id,
                            requestId: v.requestId,
                            companyName: v.companyName,
                            studentName: v.studentName,
                            usn: v.usn,
                            status: v.status,
                            paymentStatus: v.paymentStatus,
                            createdAt: new Date(v.createdAt).toISOString(),
                        })))}
                    >
                        <Download className="h-4 w-4 mr-2" /> Verification CSV
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Certificates</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{summary.totalCertificates}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Verifications</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{summary.totalVerifications}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Work</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{summary.pendingCertificates + summary.pendingVerifications}</div></CardContent>
                </Card>

            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileBarChart2 className="h-5 w-5" /> Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border p-4 bg-white">
                        <h3 className="font-semibold mb-3">Certificate Requests</h3>
                        <p className="text-sm text-slate-600">Completed: <span className="font-semibold text-slate-900">{summary.completedCertificates}</span></p>
                        <p className="text-sm text-slate-600">Pending/Processing: <span className="font-semibold text-slate-900">{summary.pendingCertificates}</span></p>
                    </div>
                    <div className="rounded-md border p-4 bg-white">
                        <h3 className="font-semibold mb-3">Verification Requests</h3>
                        <p className="text-sm text-slate-600">Completed: <span className="font-semibold text-slate-900">{summary.completedVerifications}</span></p>
                        <p className="text-sm text-slate-600">Pending/Processing: <span className="font-semibold text-slate-900">{summary.pendingVerifications}</span></p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
