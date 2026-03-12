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
import { API_BASE } from '@/lib/api';

const CERTIFICATE_OPTIONS = [
    { value: 'grade_card_correction', label: 'Grade Card Correction', fee: 1200 },
    { value: 'duplicate_grade_card', label: 'Duplicate Grade Card', fee: 1200 },
    { value: 'transcript', label: 'Transcript', fee: 500 },
    { value: 'provisional_degree_certificate_pdc', label: 'Provisional Degree Certificate (PDC)', fee: 1000 },
    { value: 'course_completion_certificate', label: 'Course Completion Certificate', fee: 200 },
    { value: 'no_backlog_certificate', label: 'No Backlog Certificate', fee: 200 },
    { value: 'other', label: 'Others', fee: 200 },
] as const;

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
    const [copies, setCopies] = useState(1);
    const [address, setAddress] = useState('');
    const [reason, setReason] = useState('');
    const [otherType, setOtherType] = useState('');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        if (!sessionStorage.getItem('token')) {
            router.push('/student/login');
        }
    }, [router]);

    const selectedCertificate = CERTIFICATE_OPTIONS.find(option => option.value === type);

    const getFee = () => {
        if (!selectedCertificate) return 0;
        return selectedCertificate.fee * copies;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!usn || !name || !branch || !year || !phoneNumber || !type || !mode || !copies) {
            return toast.error('Please fill all required fields.');
        }

        if (phoneNumber.length !== 10) {
            return toast.error('Phone number must be exactly 10 digits.');
        }

        if (type === 'other' && !otherType) {
            return toast.error('Please specify the custom certificate name.');
        }

        if (!file) {
            return toast.error('Please upload your Government ID proof.');
        }

        setLoading(true);

        const amount = getFee();

        try {
            const token = sessionStorage.getItem('token');
            const formData = new FormData();
            formData.append('usn', usn);
            formData.append('studentName', name);
            formData.append('branch', branch);
            formData.append('yearOfPassing', year);
            formData.append('phoneNumber', phoneNumber);
            formData.append('certificateType', type === 'other' ? otherType : type);
            formData.append('copyType', mode === 'soft' ? 'SOFT_COPY' : mode === 'hard' ? 'HARD_COPY' : 'BOTH');
            formData.append('copies', copies.toString());
            formData.append('amount', amount.toString());
            if (reason) formData.append('reason', reason);
            if (address) formData.append('address', address);
            formData.append('idProof', file as File);

            const res = await fetch(`${API_BASE}/api/student/certificates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                toast.success('Redirecting to secure payment gateway...');
                setTimeout(() => {
                    setLoading(false);
                    router.push('/student/requests');
                    toast.success('Payment successful. Request submitted!');
                }, 2000);
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to submit application.');
                setLoading(false);
            }
        } catch (error) {
            toast.error('Network error. Failed to submit.');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Apply for Certificate</h1>
                <p className="text-slate-500 mt-1">Fill out the form below to request a new certificate or document.</p>
            </div>

            <form onSubmit={handleSubmit}>
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
                                <Select onValueChange={(val: any) => setBranch(val)} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CSE">Computer Science & Engineering</SelectItem>
                                        <SelectItem value="ISE">Information Science</SelectItem>
                                        <SelectItem value="ECE">Electronics & Communication</SelectItem>
                                        <SelectItem value="EEE">Electrical & Electronics</SelectItem>
                                        <SelectItem value="ME">Mechanical Engineering</SelectItem>
                                        <SelectItem value="CE">Civil Engineering</SelectItem>
                                        <SelectItem value="AI">AI & Data Science</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="year">Year of Passing</Label>
                                <Input id="year" type="number" placeholder="2023" value={year} onChange={e => setYear(e.target.value)} required />
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
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
                            <div className="space-y-2">
                                <Label htmlFor="copies">Number of Copies</Label>
                                <Input
                                    id="copies"
                                    type="number"
                                    min="1"
                                    value={copies}
                                    onChange={e => setCopies(Math.max(1, Number(e.target.value) || 1))}
                                    required
                                />
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
                                <input
                                    id="id-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setFile(e.target.files[0]);
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
