"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ShieldCheck, RefreshCw, Settings2, UserCog } from 'lucide-react';
import { API_BASE } from '@/lib/api';

type AdminSettingsState = {
    supportEmail: string;
    frontendUrl: string;
    maintenanceMode: boolean;
    allowCompanySignup: boolean;
    smtpFromName: string;
    adminAllowedEmails: string;
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<AdminSettingsState>({
        supportEmail: 'support@gat.ac.in',
        frontendUrl: 'http://localhost:3000',
        maintenanceMode: false,
        allowCompanySignup: true,
        smtpFromName: 'Global Academy of Technology',
        adminAllowedEmails: 'sahanaa2060@gmail.com',
    });
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [registeringAdmin, setRegisteringAdmin] = useState(false);
    const [removingAdminEmail, setRemovingAdminEmail] = useState<string | null>(null);
    const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [saving, setSaving] = useState(false);

    const refreshSystemHealth = async () => {
        try {
            setBackendStatus('checking');
            const res = await fetch(`${API_BASE}/api/health`);
            setBackendStatus(res.ok ? 'online' : 'offline');
        } catch {
            setBackendStatus('offline');
        }
    };

    useEffect(() => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) return;

        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/admin/settings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSettings({
                        supportEmail: data.supportEmail,
                        frontendUrl: data.frontendUrl,
                        maintenanceMode: data.maintenanceMode,
                        allowCompanySignup: data.allowCompanySignup,
                        smtpFromName: data.smtpFromName,
                        adminAllowedEmails: data.adminAllowedEmails || '',
                    });
                }
            } catch {
                toast.error('Unable to fetch saved settings.');
            }
        };

        const checkHealth = async () => {
            await refreshSystemHealth();
        };

        fetchSettings();
        checkHealth();
    }, []);

    const saveSettings = async () => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            toast.error('Admin session not found. Please login again.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || 'Failed to save settings');
                return;
            }

            toast.success('Settings saved successfully');
        } catch {
            toast.error('Network error while saving settings');
        } finally {
            setSaving(false);
        }
    };

    const registerAdmin = async () => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            toast.error('Admin session not found. Please login again.');
            return;
        }

        const email = newAdminEmail.trim().toLowerCase();
        if (!email) {
            toast.error('Enter an admin email to register.');
            return;
        }

        setRegisteringAdmin(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/settings/admin-emails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || 'Failed to register admin email');
                return;
            }

            setSettings((prev) => ({
                ...prev,
                adminAllowedEmails: data.adminAllowedEmails || prev.adminAllowedEmails
            }));
            setNewAdminEmail('');
            toast.success('Admin email registered successfully');
        } catch {
            toast.error('Network error while registering admin email');
        } finally {
            setRegisteringAdmin(false);
        }
    };

    const removeAdmin = async (email: string) => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            toast.error('Admin session not found. Please login again.');
            return;
        }

        if (!window.confirm(`Remove admin access for ${email}?`)) {
            return;
        }

        setRemovingAdminEmail(email);
        try {
            const res = await fetch(`${API_BASE}/api/admin/settings/admin-emails`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || 'Failed to remove admin email');
                return;
            }

            setSettings((prev) => ({
                ...prev,
                adminAllowedEmails: data.adminAllowedEmails || prev.adminAllowedEmails
            }));
            toast.success('Admin email removed successfully');
        } catch {
            toast.error('Network error while removing admin email');
        } finally {
            setRemovingAdminEmail(null);
        }
    };

    const adminEmails = Array.from(new Set(
        settings.adminAllowedEmails
            .split(/[\n,;]/)
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    ));

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage operations controls, portal access, and admin governance.</p>
            </div>

            <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-700" />
                        System Status
                    </CardTitle>
                    <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50" onClick={refreshSystemHealth}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh Health
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-sm text-slate-600">Backend API</p>
                        <Badge variant="outline" className={backendStatus === 'online' ? 'border-green-500 text-green-700 bg-green-50' : backendStatus === 'offline' ? 'border-red-500 text-red-700 bg-red-50' : 'border-slate-400 text-slate-700 bg-slate-100'}>
                            {backendStatus === 'checking' ? 'Checking' : backendStatus === 'online' ? 'Online' : 'Offline'}
                        </Badge>
                        <p className="text-xs text-slate-500">Use this before doing sensitive admin operations.</p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-blue-700" />
                            General Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="supportEmail">Support Email <span className="text-red-500">*</span></Label>
                            <Input id="supportEmail" value={settings.supportEmail} onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="frontendUrl">Frontend URL <span className="text-red-500">*</span></Label>
                            <Input id="frontendUrl" value={settings.frontendUrl} onChange={(e) => setSettings((s) => ({ ...s, frontendUrl: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpFromName">Email Sender Name <span className="text-red-500">*</span></Label>
                            <Input id="smtpFromName" value={settings.smtpFromName} onChange={(e) => setSettings((s) => ({ ...s, smtpFromName: e.target.value }))} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Access Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Maintenance Mode</p>
                                <p className="text-sm text-slate-500">Temporarily restrict portal operations.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={settings.maintenanceMode ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}
                                onClick={() => setSettings((s) => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                            >
                                {settings.maintenanceMode ? 'Enabled' : 'Disabled'}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Allow Company Login/Signup</p>
                                <p className="text-sm text-slate-500">Enable or disable company-side access.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={settings.allowCompanySignup ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}
                                onClick={() => setSettings((s) => ({ ...s, allowCompanySignup: !s.allowCompanySignup }))}
                            >
                                {settings.allowCompanySignup ? 'Enabled' : 'Disabled'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-blue-700" />
                            Admin Governance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newAdminEmail">Register New Admin Email <span className="text-red-500">*</span></Label>
                            <div className="flex gap-2">
                                <Input
                                    id="newAdminEmail"
                                    type="email"
                                    placeholder="new-admin@example.com"
                                    value={newAdminEmail}
                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                />
                                <Button onClick={registerAdmin} disabled={registeringAdmin}>
                                    {registeringAdmin ? 'Registering...' : 'Register'}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                                Registered admins can login using OTP and access the admin dashboard.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="adminAllowedEmails">Registered Admin Emails</Label>
                            <div className="overflow-x-auto rounded-md border border-slate-200">
                                <Table>
                                    <TableHeader className="bg-slate-50 border-b">
                                        <TableRow>
                                            <TableHead className="font-semibold text-slate-700">Email</TableHead>
                                            <TableHead className="w-36 text-right font-semibold text-slate-700">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {adminEmails.map((email) => (
                                            <TableRow key={email}>
                                                <TableCell className="text-slate-700">{email}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-red-200 text-red-700 hover:bg-red-50"
                                                        onClick={() => removeAdmin(email)}
                                                        disabled={removingAdminEmail === email}
                                                    >
                                                        {removingAdminEmail === email ? 'Removing...' : 'Remove'}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {adminEmails.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={2} className="py-4 text-center text-slate-500">No admin emails configured.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
            </div>
        </div>
    );
}
