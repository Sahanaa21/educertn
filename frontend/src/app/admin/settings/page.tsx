"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

type AdminSettingsState = {
    supportEmail: string;
    frontendUrl: string;
    maintenanceMode: boolean;
    allowCompanySignup: boolean;
    smtpFromName: string;
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<AdminSettingsState>({
        supportEmail: 'support@gat.ac.in',
        frontendUrl: 'http://localhost:3000',
        maintenanceMode: false,
        allowCompanySignup: true,
        smtpFromName: 'Global Academy of Technology',
    });
    const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [saving, setSaving] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
    const [savingPw, setSavingPw] = useState(false);

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
                    });
                }
            } catch {
                toast.error('Unable to fetch saved settings.');
            }
        };

        const checkHealth = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/health`);
                setBackendStatus(res.ok ? 'online' : 'offline');
            } catch {
                setBackendStatus('offline');
            }
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

    const changePassword = async () => {
        if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
            toast.error('All password fields are required.');
            return;
        }
        if (pwForm.newPw !== pwForm.confirm) {
            toast.error('New passwords do not match.');
            return;
        }
        if (pwForm.newPw.length < 8) {
            toast.error('New password must be at least 8 characters.');
            return;
        }

        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            toast.error('Admin session not found. Please login again.');
            return;
        }

        setSavingPw(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw })
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || 'Failed to change password');
                return;
            }
            toast.success('Password changed successfully.');
            setPwForm({ current: '', newPw: '', confirm: '' });
        } catch {
            toast.error('Network error while changing password');
        } finally {
            setSavingPw(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage portal preferences and operational toggles.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-600">
                        Backend API: <span className={`font-semibold ${backendStatus === 'online' ? 'text-green-600' : backendStatus === 'offline' ? 'text-red-600' : 'text-slate-700'}`}>
                            {backendStatus === 'checking' ? 'Checking...' : backendStatus.toUpperCase()}
                        </span>
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>General Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="supportEmail">Support Email</Label>
                            <Input id="supportEmail" value={settings.supportEmail} onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="frontendUrl">Frontend URL</Label>
                            <Input id="frontendUrl" value={settings.frontendUrl} onChange={(e) => setSettings((s) => ({ ...s, frontendUrl: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpFromName">Email Sender Name</Label>
                            <Input id="smtpFromName" value={settings.smtpFromName} onChange={(e) => setSettings((s) => ({ ...s, smtpFromName: e.target.value }))} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Access Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Maintenance Mode</p>
                                <p className="text-sm text-slate-500">Temporarily restrict portal operations.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.maintenanceMode}
                                onChange={(e) => setSettings((s) => ({ ...s, maintenanceMode: e.target.checked }))}
                                className="h-4 w-4"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Allow Company Login/Signup</p>
                                <p className="text-sm text-slate-500">Enable or disable company-side access.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.allowCompanySignup}
                                onChange={(e) => setSettings((s) => ({ ...s, allowCompanySignup: e.target.checked }))}
                                className="h-4 w-4"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Change Admin Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPw">Current Password</Label>
                        <Input
                            id="currentPw"
                            type="password"
                            placeholder="••••••••"
                            value={pwForm.current}
                            onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPw">New Password</Label>
                        <Input
                            id="newPw"
                            type="password"
                            placeholder="Min. 8 characters"
                            value={pwForm.newPw}
                            onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPw">Confirm New Password</Label>
                        <Input
                            id="confirmPw"
                            type="password"
                            placeholder="Re-enter new password"
                            value={pwForm.confirm}
                            onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            variant="destructive"
                            onClick={changePassword}
                            disabled={savingPw}
                        >
                            {savingPw ? 'Changing...' : 'Change Password'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
