"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UploadCloud, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { openZwitchCheckout } from '@/lib/zwitch';
import Link from 'next/link';

const CERTIFICATE_OPTIONS = [
    { value: 'grade_card_correction', label: 'Grade Card Correction', fee: 1200 },
    { value: 'duplicate_grade_card', label: 'Duplicate Grade Card', fee: 1200 },
    { value: 'transcript', label: 'Transcript', fee: 500 },
    { value: 'provisional_degree_certificate_pdc', label: 'Provisional Degree Certificate (PDC)', fee: 1000 },
    { value: 'course_completion_certificate', label: 'Course Completion Certificate', fee: 200 },
    { value: 'no_backlog_certificate', label: 'No Backlog Certificate', fee: 200 },
    { value: 'other', label: 'Others', fee: 200 },
] as const;

const MAX_ID_PROOF_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ID_PROOF_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MIN_PASSING_YEAR = 2000;
const MAX_PASSING_YEAR = new Date().getFullYear() + 1;

export default function ApplyCertificate() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form States
    const [usn, setUsn] = useState('');
    const [name, setName] = useState('');
    const [branch, setBranch] = useState('');
    const [year, setYear] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [type, setType] = useState('');
    const [mode, setMode] = useState('');
    const [address, setAddress] = useState('');
    const [reason, setReason] = useState('');
    const [otherType, setOtherType] = useState('');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (!token) {
            router.push('/student/login');
            return;
        }

        const loadProfile = async () => {
            try {
                const res = await apiFetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) return;
                const data = await res.json().catch(() => null);
                const user = data?.user;
                const profile = data?.studentProfile;

                if (user?.name) setName(String(user.name));
                if (profile?.usn) setUsn(String(profile.usn));
                if (profile?.branch) setBranch(String(profile.branch));
                if (profile?.yearOfPassing) setYear(String(profile.yearOfPassing));
                if (profile?.phoneNumber) setPhoneNumber(String(profile.phoneNumber));
            } catch {
                // Keep manual entry when profile autofill is unavailable.
            }
        };

        void loadProfile();
    }, [router]);

    const selectedCertificate = CERTIFICATE_OPTIONS.find(option => option.value === type);

    const getFee = () => {
        if (!selectedCertificate) return 0;
        return selectedCertificate.fee;
    };

    const validateForm = () => {
        if (!usn || !name || !branch || !year || !phoneNumber || !type || !mode) {
            toast.error('Please fill all required fields.');
            return false;
        }

        if (!/^[A-Za-z0-9]{6,20}$/.test(usn.trim())) {
            toast.error('Enter a valid USN.');
            return false;
        }

        if (name.trim().length < 3) {
            toast.error('Enter the full student name.');
            return false;
        }

        const passingYear = Number(year);
        if (!Number.isInteger(passingYear) || String(passingYear).length !== 4 || passingYear < MIN_PASSING_YEAR || passingYear > MAX_PASSING_YEAR) {
            toast.error(`Enter a valid year of passing (${MIN_PASSING_YEAR} or later).`);
            return false;
        }

        if (phoneNumber.length !== 10) {
            toast.error('Phone number must be exactly 10 digits.');
            return false;
        }

        if (type === 'other' && !otherType.trim()) {
            toast.error('Please specify the custom certificate name.');
            return false;
        }

        if ((mode === 'hard' || mode === 'both') && address.trim().length < 12) {
            toast.error('Enter a complete postal address for hard copy delivery.');
            return false;
        }

        if (reason.trim().length < 8) {
            toast.error('Please provide a short reason for this request.');
            return false;
        }

        if (!file) {
            toast.error('Please upload your Government ID proof.');
            return false;
        }

        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!ALLOWED_ID_PROOF_EXTENSIONS.includes(extension)) {
            toast.error('Invalid ID proof format. Allowed: PDF, JPG, JPEG, PNG.');
            return false;
        }

        if (file.size > MAX_ID_PROOF_SIZE_BYTES) {
            toast.error('ID proof file is too large. Maximum allowed size is 10MB.');
            return false;
        }

        return true;
    };

    const submitApplication = async (e?: React.FormEvent): Promise<void> => {
        if (e) e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);

        const amount = getFee();

        try {
            const token = sessionStorage.getItem('token');
            if (!token) {
                toast.error('Session expired. Please login again.');
                router.push('/student/login');
                return;
            }

            const formData = new FormData();
            formData.append('usn', usn);
            formData.append('studentName', name);
            formData.append('branch', branch);
            formData.append('yearOfPassing', year);
            formData.append('phoneNumber', phoneNumber);
            formData.append('certificateType', type === 'other' ? otherType : type);
            formData.append('copyType', mode === 'soft' ? 'SOFT_COPY' : mode === 'hard' ? 'HARD_COPY' : 'BOTH');
            formData.append('copies', '1');
            formData.append('amount', amount.toString());
            if (reason) formData.append('reason', reason);
            if (address) formData.append('address', address);
            formData.append('idProof', file as File);

            const res = await apiFetch('/api/student/certificates', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const createdRequest = data?.request;
                const order = data?.zwitchOrder;

                if (!createdRequest?.id || !order?.id || !order?.checkoutUrl) {
                    toast.error('Failed to initialize payment order.');
                    return;
                }

                try {
                    await openZwitchCheckout({ checkoutUrl: order.checkoutUrl });
                } catch (checkoutErr: any) {
                    toast.error(checkoutErr?.message || 'Unable to open payment checkout.');
                    return;
                }

                const shouldVerify = window.confirm('After completing payment in the opened page, click OK to confirm and verify your payment.');
                if (!shouldVerify) {
                    toast.message('Payment verification skipped for now. You can retry from your requests page.');
                    return;
                }

                const verifyRes = await apiFetch(`/api/student/certificates/${createdRequest.id}/verify-payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        zwitchOrderId: order.id
                    })
                });

                if (!verifyRes.ok) {
                    const verifyData = await verifyRes.json().catch(() => null);
                    toast.error(verifyData?.message || 'Payment verification failed. Contact support.');
                    return;
                }

                toast.success('Payment successful. Request submitted.');
                router.push('/student/requests');
            } else {
                if (res.status === 401 || res.status === 403) {
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    toast.error('Session expired. Please login again.');
                    router.push('/student/login');
                    return;
                }

                const raw = await res.text();
                let data: any = null;
                try {
                    data = raw ? JSON.parse(raw) : null;
                } catch {
                    data = null;
                }

                toast.error(data?.message || 'Failed to submit application.');
            }
        } catch (error) {
            toast.error('Network error. Failed to submit.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Apply for Certificate</h1>
                <p className="text-slate-500 mt-1">Fill out the form below to request a new certificate or document.</p>
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                For photocopy and challenge re-evaluation requests, use the dedicated student service page.
                {' '}
                <Link href="/student/academic-services" className="font-semibold underline underline-offset-2">
                    Go to Academic Services
                </Link>
            </div>

            <form onSubmit={submitApplication}>
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Student Details</CardTitle>
                        <CardDescription>Ensure your details match university records.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="usn">USN</Label>
                                <Input id="usn" placeholder="1GA..." value={usn} onChange={e => setUsn(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="branch">Branch</Label>
                                <Select value={branch} onValueChange={(val: any) => setBranch(val)} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CSE">CSE - Computer Science and Engineering</SelectItem>
                                        <SelectItem value="ISE">ISE - Information Science and Engineering</SelectItem>
                                        <SelectItem value="ECE">ECE - Electronics and Communication Engineering</SelectItem>
                                        <SelectItem value="EEE">EEE - Electrical and Electronics Engineering</SelectItem>
                                        <SelectItem value="ME">ME - Mechanical Engineering</SelectItem>
                                        <SelectItem value="AIDS">AIDS - Artificial Intelligence and Data Science</SelectItem>
                                        <SelectItem value="AIML">AIML - Artificial Intelligence and Machine Learning</SelectItem>
                                        <SelectItem value="CSE(AIML)">CSE(AIML) - CSE with AI and ML</SelectItem>
                                        <SelectItem value="CIVIL">CIVIL - Civil Engineering</SelectItem>
                                        <SelectItem value="AERONAUTICAL">AERONAUTICAL - Aeronautical Engineering</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="year">Year of Passing</Label>
                                <Input
                                    id="year"
                                    type="number"
                                    placeholder="2023"
                                    min={MIN_PASSING_YEAR}
                                    max={MAX_PASSING_YEAR}
                                    step={1}
                                    value={year}
                                    onChange={(e) => {
                                        const digits = String(e.target.value || '').replace(/\D/g, '').slice(0, 4);
                                        if (!digits) {
                                            setYear('');
                                            return;
                                        }
                                        setYear(digits);
                                    }}
                                    onBlur={() => {
                                        if (!year) return;
                                        const parsed = Number(year);
                                        if (Number.isNaN(parsed)) {
                                            setYear('');
                                            return;
                                        }
                                        const bounded = Math.min(MAX_PASSING_YEAR, Math.max(MIN_PASSING_YEAR, parsed));
                                        setYear(String(bounded));
                                    }}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input
                                    id="phoneNumber"
                                    type="tel"
                                    placeholder="9876543210"
                                    value={phoneNumber}
                                    inputMode="numeric"
                                    maxLength={10}
                                    pattern="[0-9]{10}"
                                    onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6 shadow-sm">
                    <CardHeader>
                        <CardTitle>Request Details</CardTitle>
                        <CardDescription>Select the type of certificate and delivery preferences.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Certificate Type</Label>
                            <Select onValueChange={(val) => setType(String(val ?? ''))} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Certificate" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CERTIFICATE_OPTIONS.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {type === 'other' && (
                            <div className="space-y-2">
                                <Label htmlFor="otherType">Specify Certificate Name <span className="text-red-500">*</span></Label>
                                <Input id="otherType" placeholder="Migration Certificate, etc." value={otherType} onChange={e => setOtherType(e.target.value)} required />
                            </div>
                        )}

                        {type === 'grade_card_correction' && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                                For grade correction, 10th standard marks card copy must be submitted.
                            </div>
                        )}

                        {type === 'duplicate_grade_card' && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                                For duplicate grade card, FIR copy must be submitted.
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="mode">Delivery Mode</Label>
                                <Select onValueChange={(val) => setMode(String(val ?? ''))} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="soft">Soft Copy (Email)</SelectItem>
                                        <SelectItem value="hard">Hard Copy (Postal)</SelectItem>
                                        <SelectItem value="both">Both Soft & Hard Copy</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {(mode === 'hard' || mode === 'both') && (
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="address">Postal Address <span className="text-red-500">*</span></Label>
                                <Textarea id="address" placeholder="Enter full delivery address with pincode..." value={address} onChange={e => setAddress(e.target.value)} required={mode === 'hard' || mode === 'both'} />
                            </div>
                        )}

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="reason">Reason for Request</Label>
                            <Textarea id="reason" placeholder="Briefly explain why you need this document..." value={reason} onChange={e => setReason(e.target.value)} required />
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6 shadow-sm">
                    <CardHeader>
                        <CardTitle>Document Uploads</CardTitle>
                        <CardDescription>Provide supporting documents for verification.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Government ID Proof <span className="text-red-500">*</span></Label>
                            <Label htmlFor="id-upload" className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer w-full text-center">
                                <UploadCloud className="h-8 w-8 mb-2 text-blue-500" />
                                {file ? (
                                    <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">{file.name} (Ready to upload)</span>
                                ) : (
                                    <span className="text-sm font-medium">Click to upload or drag & drop</span>
                                )}
                                <span className="mt-1 text-xs text-slate-500">Supported formats: PDF, JPG, JPEG, PNG</span>
                                <span className="text-xs text-slate-500">Maximum size: 10MB</span>
                                <input
                                    id="id-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const selectedFile = e.target.files[0];
                                            const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
                                            if (!ALLOWED_ID_PROOF_EXTENSIONS.includes(extension)) {
                                                toast.error('Invalid ID proof format. Allowed: PDF, JPG, JPEG, PNG.');
                                                e.currentTarget.value = '';
                                                return;
                                            }
                                            if (selectedFile.size > MAX_ID_PROOF_SIZE_BYTES) {
                                                toast.error('ID proof file is too large. Maximum allowed size is 10MB.');
                                                e.currentTarget.value = '';
                                                return;
                                            }
                                            setFile(selectedFile);
                                            toast.success('File prepared successfully.');
                                        }
                                    }}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                            </Label>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t flex items-center justify-between p-6">
                        <div className="flex flex-col">
                            <span className="text-sm text-slate-500">
                                Certificate Fee: {selectedCertificate ? `Rs ${selectedCertificate.fee.toFixed(2)}` : 'Select certificate type'}
                            </span>
                            <span className="text-xs text-amber-700 mt-1 font-medium">Please verify all details before payment. Submitted requests cannot be edited or cancelled.</span>
                            <span className="text-sm text-slate-500">Total Amount Payable</span>
                            <span className="text-2xl font-bold text-slate-900">₹ {getFee().toFixed(2)}</span>
                        </div>
                        <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700 w-1/2" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                            {loading ? 'Processing...' : 'Pay & Submit'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>


        </div>
    );
}
