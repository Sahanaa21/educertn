import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { COLLEGE_CONTACT, COLLEGE_NAME } from '@/lib/branding';

export default function Footer() {
    return (
        <footer className="mt-auto w-full border-t-4 border-amber-500 bg-slate-900 text-white">
            <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-8 md:grid-cols-12">
                <div className="md:col-span-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Institution</p>
                    <h3 className="mb-4 text-2xl font-bold text-white">{COLLEGE_NAME}</h3>
                    <p className="max-w-md text-sm leading-7 text-slate-300">Official College Portal for certificate requests, company verification, and academic service workflows.</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">Bengaluru, Karnataka</p>
                </div>

                <div className="md:col-span-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Navigation</p>
                    <h3 className="mb-4 text-lg font-bold text-white">Quick Links</h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                        <li><Link href="/student" className="inline-flex items-center transition-colors hover:text-white">Student Portal</Link></li>
                        <li><Link href="/company" className="inline-flex items-center transition-colors hover:text-white">Company Verification</Link></li>
                        <li><Link href="/report-issue" className="inline-flex items-center transition-colors hover:text-white">Report an Issue</Link></li>
                    </ul>
                </div>

                <div id="contact" className="md:col-span-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Help Desk</p>
                    <h3 className="mb-4 text-lg font-bold text-white">Contact Information</h3>
                    <div className="space-y-3 text-sm text-slate-300">
                        <p className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>{COLLEGE_CONTACT.email}</span></p>
                        <p className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>{COLLEGE_CONTACT.phone}</span></p>
                        <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>{COLLEGE_CONTACT.addressLine1}, {COLLEGE_CONTACT.addressLine2}</span></p>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-700/80 px-4 py-5 text-center text-xs text-slate-500 sm:px-8">
                <p className="mb-2">This official portal supports certificate requests, company verification, and academic service workflows.</p>
                <p>&copy; {new Date().getFullYear()} {COLLEGE_NAME}. All rights reserved.</p>
            </div>
        </footer>
    );
}
