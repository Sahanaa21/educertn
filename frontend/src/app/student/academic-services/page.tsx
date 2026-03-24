"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { openRazorpayCheckout } from '@/lib/razorpay';

type Availability = {
    active: boolean;
    enabled: boolean;
    startAt: string | null;
    endAt: string | null;
};

const SERVICE_OPTIONS = [
    { value: 'PHOTOCOPY', label: 'Photocopy', unitFee: 500 },
    { value: 'REEVALUATION', label: 'Challenge Re-evaluation', unitFee: 3000 },
] as const;

export default function StudentAcademicServicesPage() {
    const router = useRouter();

    const [availability, setAvailability] = useState<Availability | null>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [payingId, setPayingId] = useState<string | null>(null);

    const [serviceType, setServiceType] = useState<string>('PHOTOCOPY');
    const [semester, setSemester] = useState('');
    const [courseCount, setCourseCount] = useState('1');
    const [courseNames, setCourseNames] = useState<string[]>(['']);

    const selectedService = SERVICE_OPTIONS.find((option) => option.value === serviceType) || SERVICE_OPTIONS[0];
    const totalAmount = useMemo(() => Number(courseCount || 0) * selectedService.unitFee, [courseCount, selectedService.unitFee]);

    const getStudentToken = useCallback(() => {
        const token = sessionStorage.getItem('token');
        if (!token) {
            router.push('/student/login');
            return null;
        }
        return token;
    }, [router]);

    useEffect(() => {
        const count = Number(courseCount);
        if (!Number.isInteger(count) || count < 1 || count > 7) return;

        setCourseNames((prev) => {
            const next = [...prev];
            if (next.length < count) {
                while (next.length < count) next.push('');
            } else if (next.length > count) {
                next.length = count;
            }
            return next;
        });
    }, [courseCount]);

    const fetchData = useCallback(async () => {
        const token = getStudentToken();
        if (!token) return;

        setLoading(true);
        try {
            const [availabilityRes, requestsRes] = await Promise.all([
                apiFetch('/api/student/academic-services/availability', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                apiFetch('/api/student/academic-services', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (!availabilityRes.ok) {
                throw new Error('Failed to load service availability');
            }

            const availabilityJson = await availabilityRes.json();
            setAvailability(availabilityJson);

            if (requestsRes.ok) {
                const requestsJson = await requestsRes.json();
                setRequests(Array.isArray(requestsJson) ? requestsJson : []);
            }
        } catch {
            toast.error('Failed to load academic services data');
        } finally {
            setLoading(false);
        }
    }, [getStudentToken]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const submitRequest = async () => {
        const token = getStudentToken();
        if (!token) return;

        const parsedCount = Number(courseCount);
        const normalizedCourseNames = courseNames.map((name) => name.trim()).filter(Boolean);

        if (!semester.trim()) {
            toast.error('Semester is required');
            return;
        }
        if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 7) {
            toast.error('Number of courses must be between 1 and 7');
            return;
        }
        if (normalizedCourseNames.length !== parsedCount) {
            toast.error('Enter course names matching the selected count');
            return;
        }

        setSubmitting(true);
        try {
            const createRes = await apiFetch('/api/student/academic-services', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    serviceType,
                    semester: semester.trim(),
                    courseCount: parsedCount,
                    courseNames: normalizedCourseNames,
                })
            });

            const createJson = await createRes.json().catch(() => null);
            if (!createRes.ok) {
                toast.error(createJson?.message || 'Failed to create request');
                return;
            }

            const request = createJson?.request;
            const order = createJson?.razorpayOrder;
            if (!request?.id || !order?.id || !order?.keyId) {
                toast.error('Payment initialization failed');
                return;
            }

            const payment = await openRazorpayCheckout({
                keyId: order.keyId,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: order.name || 'Global Academy of Technology',
                description: order.description || `${serviceType} Request`,
            });

            const verifyRes = await apiFetch(`/api/student/academic-services/${request.id}/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    razorpayOrderId: payment.razorpay_order_id,
                    razorpayPaymentId: payment.razorpay_payment_id,
                    razorpaySignature: payment.razorpay_signature,
                })
            });

            const verifyJson = await verifyRes.json().catch(() => null);
            if (!verifyRes.ok) {
                toast.error(verifyJson?.message || 'Payment verification failed');
                return;
            }

            toast.success('Request submitted successfully');
            setCourseNames(Array.from({ length: 1 }, () => ''));
            setSemester('');
            setCourseCount('1');
            await fetchData();
        } catch (error: any) {
            toast.error(error?.message || 'Payment failed or cancelled');
        } finally {
            setSubmitting(false);
        }
    };

    const retryPayment = async (request: any) => {
        const token = getStudentToken();
        if (!token) return;

        setPayingId(request.id);
        try {
            const orderRes = await apiFetch(`/api/student/academic-services/${request.id}/create-payment-order`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            const orderJson = await orderRes.json().catch(() => null);
            if (!orderRes.ok) {
                toast.error(orderJson?.message || 'Failed to create payment order');
                return;
            }

            const order = orderJson?.razorpayOrder;
            const payment = await openRazorpayCheckout({
                keyId: order.keyId,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: order.name || 'Global Academy of Technology',
                description: order.description || `${request.serviceType} Request`,
            });

            const verifyRes = await apiFetch(`/api/student/academic-services/${request.id}/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    razorpayOrderId: payment.razorpay_order_id,
                    razorpayPaymentId: payment.razorpay_payment_id,
                    razorpaySignature: payment.razorpay_signature,
                })
            });

            const verifyJson = await verifyRes.json().catch(() => null);
            if (!verifyRes.ok) {
                toast.error(verifyJson?.message || 'Payment verification failed');
                return;
            }

            toast.success('Payment completed');
            await fetchData();
        } catch (error: any) {
            toast.error(error?.message || 'Payment failed or cancelled');
        } finally {
            setPayingId(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading academic services...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Photocopy and Challenge Re-evaluation</h1>
                <p className="text-sm text-slate-500">Apply for student-only academic services when the admin window is open.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Service Window</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div>
                        Current status:{' '}
                        <Badge variant="outline" className={availability?.active ? 'border-green-500 text-green-700' : 'border-amber-500 text-amber-700'}>
                            {availability?.active ? 'OPEN' : 'CLOSED'}
                        </Badge>
                    </div>
                    <p className="text-slate-600">Start: {availability?.startAt ? new Date(availability.startAt).toLocaleString() : 'Not set'}</p>
                    <p className="text-slate-600">End: {availability?.endAt ? new Date(availability.endAt).toLocaleString() : 'Not set'}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>New Request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Service Type</Label>
                            <Select value={serviceType} onValueChange={(value) => setServiceType(value || 'PHOTOCOPY')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select service" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SERVICE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label} (Rs {option.unitFee} per course)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="e.g. 6th Semester" />
                        </div>
                        <div className="space-y-2">
                            <Label>Number of Courses</Label>
                            <Select value={courseCount} onValueChange={(value) => setCourseCount(value || '1')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select number of courses" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 7 }, (_, index) => String(index + 1)).map((value) => (
                                        <SelectItem key={value} value={value}>{value}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Total Fee</Label>
                            <Input value={`Rs ${Number.isFinite(totalAmount) ? totalAmount : 0}`} readOnly />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Course Names</Label>
                        {courseNames.map((courseName, index) => (
                            <Input
                                key={`course-${index + 1}`}
                                value={courseName}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setCourseNames((prev) => {
                                        const next = [...prev];
                                        next[index] = value;
                                        return next;
                                    });
                                }}
                                placeholder={`Course ${index + 1} name`}
                            />
                        ))}
                    </div>

                    <Button onClick={submitRequest} disabled={!availability?.active || submitting}>
                        {submitting ? 'Submitting...' : 'Submit and Pay'}
                    </Button>
                    {!availability?.active ? <p className="text-xs text-amber-700">Requests are disabled outside the configured date window.</p> : null}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>My Academic Service Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 pr-3">Request ID</th>
                                    <th className="py-2 pr-3">Type</th>
                                    <th className="py-2 pr-3">Semester</th>
                                    <th className="py-2 pr-3">Courses</th>
                                    <th className="py-2 pr-3">Amount</th>
                                    <th className="py-2 pr-3">Payment</th>
                                    <th className="py-2 pr-3">Status</th>
                                    <th className="py-2 pr-3">Remarks</th>
                                    <th className="py-2 pr-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr>
                                        <td className="py-4 text-slate-500" colSpan={9}>No requests yet.</td>
                                    </tr>
                                ) : requests.map((request) => (
                                    <tr key={request.id} className="border-b align-top">
                                        <td className="py-2 pr-3 font-medium">{request.requestId}</td>
                                        <td className="py-2 pr-3">{String(request.serviceType || '').replace('_', ' ')}</td>
                                        <td className="py-2 pr-3">{request.semester}</td>
                                        <td className="py-2 pr-3">{request.courseCount}</td>
                                        <td className="py-2 pr-3">Rs {Number(request.amount || 0).toFixed(2)}</td>
                                        <td className="py-2 pr-3">{request.paymentStatus}</td>
                                        <td className="py-2 pr-3">{request.status}</td>
                                        <td className="py-2 pr-3 max-w-sm">
                                            {request.status === 'RESULT_PUBLISHED' && request.resultSummary ? (
                                                <p className="text-slate-700">{request.resultSummary}</p>
                                            ) : request.status === 'REJECTED' && request.adminRemarks ? (
                                                <p className="text-red-700">{request.adminRemarks}</p>
                                            ) : (
                                                <p className="text-slate-400">-</p>
                                            )}
                                        </td>
                                        <td className="py-2 pr-3">
                                            {request.paymentStatus !== 'PAID' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => retryPayment(request)}
                                                    disabled={payingId === request.id}
                                                >
                                                    {payingId === request.id ? 'Processing...' : 'Pay Now'}
                                                </Button>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
