import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Settings as SettingsIcon, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudentProfile() {
    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
                <p className="text-slate-500 mt-1">Manage your account information and preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <User className="h-5 w-5 text-blue-500" />
                            Personal Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-500">Email Address</p>
                            <p className="text-slate-900 font-semibold" id="profile-email">student@gat.ac.in</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-500">Account Type</p>
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                Student Candidate
                            </span>
                        </div>
                        <Button variant="outline" className="w-full mt-2">Edit Details</Button>
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Bell className="h-5 w-5 text-yellow-500" />
                            Notifications
                        </CardTitle>
                        <CardDescription>Manage how we contact you about your requests.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <p className="font-medium text-slate-900">Email Alerts</p>
                                <p className="text-sm text-slate-500">Receive updates when your certificate status changes.</p>
                            </div>
                            <div className="h-6 w-11 rounded-full bg-blue-600 flex items-center p-1 justify-end cursor-pointer">
                                <div className="h-4 w-4 rounded-full bg-white shadow-sm"></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <p className="font-medium text-slate-900">SMS Alerts</p>
                                <p className="text-sm text-slate-500">Get text messages for physical dispatch tracking.</p>
                            </div>
                            <div className="h-6 w-11 rounded-full bg-slate-200 flex items-center p-1 justify-start cursor-pointer">
                                <div className="h-4 w-4 rounded-full bg-white shadow-sm"></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
