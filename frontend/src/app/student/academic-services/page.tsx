"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { openZwitchCheckout } from '@/lib/zwitch';
import { verifyAcademicServicePaymentWithRetry } from '@/lib/payment';

type Availability = {
    active: boolean;
    enabled: boolean;
    startAt: string | null;
    endAt: string | null;
};

type StudentInfo = {
    name: string;
    usn: string;
    branch: string;
    year: string;
};

const SERVICE_OPTIONS = [
    { value: 'PHOTOCOPY', label: 'Photocopy', unitFee: 500 },
    { value: 'REEVALUATION', label: 'Challenge Re-evaluation', unitFee: 3000 },
] as const;

const SEMESTER_OPTIONS = [
    '1st Semester',
    '2nd Semester',
    '3rd Semester',
    '4th Semester',
    '5th Semester',
    '6th Semester',
    '7th Semester',
    '8th Semester',
] as const;

export default function StudentAcademicServicesPage() {
    const router = useRouter();

    const [availability, setAvailability] = useState<Availability | null>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [payingId, setPayingId] = useState<string | null>(null);
    const [studentInfo, setStudentInfo] = useState<StudentInfo>({
        name: '',
        usn: '',
        branch: '',
        year: '',
    });

    const [serviceType, setServiceType] = useState<string>('PHOTOCOPY');
    const [semester, setSemester] = useState('');
    const [courseCount, setCourseCount] = useState('1');
    const [courseNames, setCourseNames] = useState<string[]>(['']);

    const selectedService = SERVICE_OPTIONS.find((option) => option.value === serviceType) || SERVICE_OPTIONS[0];
    const totalAmount = useMemo(() => Number(courseCount || 0) * selectedService.unitFee, [courseCount, selectedService.unitFee]);
    const isWindowClosed = !availability?.active;

    const formatEnumValue = (value: string) => {
        return String(value || '')
            .split('_')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    };

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
            const [availabilityRes, requestsRes, meRes] = await Promise.all([
                apiFetch('/api/student/academic-services/availability', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                apiFetch('/api/student/academic-services', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                apiFetch('/api/auth/me', {
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

            if (meRes.ok) {
                const meJson = await meRes.json().catch(() => null);
                setStudentInfo({
                    name: String(meJson?.user?.name || '').trim(),
                    usn: String(meJson?.studentProfile?.usn || '').trim(),
                    branch: String(meJson?.studentProfile?.branch || '').trim(),
                    year: String(meJson?.studentProfile?.yearOfPassing || '').trim(),
                });
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
        let createdRequestId = '';

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
        if (!studentInfo.name || !studentInfo.usn || !studentInfo.branch || !studentInfo.year) {
            toast.error('Student profile is incomplete. Please update Name, USN, Branch and Year in your profile.');
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
            const order = createJson?.zwitchOrder;
            createdRequestId = String(request?.id || '');
            if (!request?.id || !order?.id || !order?.accessKey) {
                toast.error('Payment initialization failed');
                return;
            }

            await openZwitchCheckout({
                paymentToken: order.id,
                accessKey: order.accessKey,
                fallbackAccessKey: order.fallbackAccessKey,
                environment: order.environment
            });

            toast.message('Payment window opened. Verifying automatically...');
            const verification = await verifyAcademicServicePaymentWithRetry({
                requestId: request.id,
                zwitchOrderId: order.id,
                token,
                attempts: 10,
                intervalMs: 3000,
            });

            if (!verification.verified) {
                await apiFetch(`/api/student/academic-services/${request.id}/mark-payment-failed`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => undefined);
                toast.error(verification.message || 'Payment verification failed');
                return;
            }

            toast.success('Request submitted successfully');
            setCourseNames(Array.from({ length: 1 }, () => ''));
            setSemester('');
            setCourseCount('1');
            await fetchData();
        } catch (error: any) {
            const message = String(error?.message || '').toLowerCase();
            if (createdRequestId) {
                await apiFetch(`/api/student/academic-services/${createdRequestId}/mark-payment-failed`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => undefined);
            }
            if (message.includes('cancelled')) {
                toast.message('Payment was cancelled. You can retry when ready.');
            } else {
                toast.error(error?.message || 'Payment failed');
            }
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

            const order = orderJson?.zwitchOrder;
            if (!order?.id || !order?.accessKey) {
                toast.error('Payment initialization failed');
                return;
            }

            await openZwitchCheckout({
                paymentToken: order.id,
                accessKey: order.accessKey,
                fallbackAccessKey: order.fallbackAccessKey,
                environment: order.environment
            });

            toast.message('Payment window opened. Verifying automatically...');
            const verification = await verifyAcademicServicePaymentWithRetry({
                requestId: request.id,
                zwitchOrderId: order.id,
                token,
                attempts: 10,
                intervalMs: 3000,
            });

            if (!verification.verified) {
                await apiFetch(`/api/student/academic-services/${request.id}/mark-payment-failed`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => undefined);
                toast.error(verification.message || 'Payment verification failed');
                return;
            }

            toast.success('Payment completed');
            await fetchData();
        } catch (error: any) {
            const message = String(error?.message || '').toLowerCase();
            await apiFetch(`/api/student/academic-services/${request.id}/mark-payment-failed`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => undefined);
            if (message.includes('cancelled')) {
                toast.message('Payment was cancelled. You can retry when ready.');
            } else {
                toast.error(error?.message || 'Payment failed');
            }
        } finally {
            setPayingId(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading academic services...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h1 className="text-2xl font-bold text-slate-900">Photocopy and Challenge Re-evaluation</h1>
                <p className="mt-2 text-sm text-slate-600">Apply for student-only academic services when the admin window is open.</p>
            </div>

            <Card className="border border-slate-200 shadow-sm">
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

            <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>New Request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-3 text-sm font-semibold text-slate-700">Student Information</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={studentInfo.name || 'Not available'} readOnly disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>USN</Label>
                                <Input value={studentInfo.usn || 'Not available'} readOnly disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Branch</Label>
                                <Input value={studentInfo.branch || 'Not available'} readOnly disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Input value={studentInfo.year || 'Not available'} readOnly disabled />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Service Type <span className="text-red-500">*</span></Label>
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
                            <Label>Semester <span className="text-red-500">*</span></Label>
                            <Select value={semester} onValueChange={(value) => setSemester(value || '')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select semester" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEMESTER_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Number of Courses <span className="text-red-500">*</span></Label>
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
                    </div>

                    <div className="space-y-3">
                        <Label>Course Names <span className="text-red-500">*</span></Label>
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

                </CardContent>
                <CardFooter className="bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                    <div className="flex flex-col text-center sm:text-left">
                        <span className="text-xs text-amber-700 mt-1 font-medium">Please verify all details before payment. Submitted requests cannot be edited or cancelled.</span>
                        <span className="text-sm text-slate-500">Total Amount Payable</span>
                        <span className="text-2xl font-bold text-slate-900">₹ {Number.isFinite(totalAmount) ? totalAmount.toFixed(2) : '0.00'}</span>
                    </div>
                    <Button onClick={submitRequest} disabled={!availability?.active || submitting} className="w-full sm:w-auto">
                        {submitting ? 'Submitting...' : 'Submit and Pay'}
                    </Button>
                </CardFooter>
                {!availability?.active ? <p className="px-6 pb-5 text-xs text-amber-700">Requests are disabled outside the configured date window.</p> : null}
            </Card>

            <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>My Academic Service Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>Request ID</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Semester</TableHead>
                                    <TableHead>Courses</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Remarks</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="py-6 text-center text-slate-500" colSpan={9}>No requests yet.</TableCell>
                                    </TableRow>
                                ) : requests.map((request) => {
                                    const canPayNow = request.paymentStatus !== 'PAID' && request.status === 'PENDING' && availability?.active;
                                    const paymentLabel = request.paymentStatus === 'PAID'
                                        ? 'Paid'
                                        : request.paymentStatus === 'FAILED'
                                            ? 'Failed'
                                            : 'Payment Required';
                                    const paymentClassName = request.paymentStatus === 'PAID'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : request.paymentStatus === 'FAILED'
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-amber-500 bg-amber-50 text-amber-700';
                                    return (
                                        <TableRow key={request.id} className="align-top">
                                            <TableCell className="font-semibold text-slate-800">{request.requestId}</TableCell>
                                            <TableCell>{formatEnumValue(request.serviceType)}</TableCell>
                                            <TableCell>{request.semester}</TableCell>
                                            <TableCell>{request.courseCount}</TableCell>
                                            <TableCell>Rs {Number(request.amount || 0).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={paymentClassName}>
                                                    {paymentLabel}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={request.status === 'RESULT_PUBLISHED' ? 'border-blue-500 bg-blue-50 text-blue-700' : request.status === 'REJECTED' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-400 bg-slate-100 text-slate-700'}>
                                                    {formatEnumValue(request.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-sm">
                                                {request.status === 'RESULT_PUBLISHED' && request.resultSummary ? (
                                                    <p className="text-slate-700">{request.resultSummary}</p>
                                                ) : request.status === 'REJECTED' && request.adminRemarks ? (
                                                    <p className="text-red-700">{request.adminRemarks}</p>
                                                ) : (
                                                    <p className="text-slate-400">-</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {canPayNow ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                                        onClick={() => retryPayment(request)}
                                                        disabled={payingId === request.id || isWindowClosed}
                                                    >
                                                        {payingId === request.id ? 'Processing...' : 'Pay Now'}
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-slate-500">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
