import Link from 'next/link';
import { COLLEGE_CONTACT, COLLEGE_NAME } from '@/lib/branding';

export default function Footer() {
    return (
        <footer className="mt-auto w-full border-t-4 border-amber-500 bg-slate-900 py-10 text-white">
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4 sm:px-8">
                <div>
                    <h3 className="mb-4 text-xl font-bold text-amber-300">{COLLEGE_NAME}</h3>
                    <p className="text-sm text-slate-300">{COLLEGE_CONTACT.addressLine1}</p>
                    <p className="text-sm text-slate-300">{COLLEGE_CONTACT.addressLine2}</p>
                    <p className="mt-2 text-sm text-slate-300">Official College Portal for Student and Verification Services</p>
                </div>
                <div>
                    <h3 className="mb-4 text-lg font-bold text-amber-300">Quick Links</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                        <li><Link href="/student" className="transition-all hover:text-white hover:underline">Student Portal</Link></li>
                        <li><Link href="/company" className="transition-all hover:text-white hover:underline">Company Verification</Link></li>
                        <li><Link href="/report-issue" className="transition-all hover:text-white hover:underline">Report an Issue</Link></li>
                    </ul>
                </div>
                <div id="contact">
                    <h3 className="mb-4 text-lg font-bold text-amber-300">Contact Information</h3>
                    <p className="text-sm text-slate-300">Email: {COLLEGE_CONTACT.email}</p>
                    <p className="text-sm text-slate-300">Phone: {COLLEGE_CONTACT.phone}</p>
                    <p className="text-sm text-slate-300">Address: {COLLEGE_CONTACT.addressLine1}, {COLLEGE_CONTACT.addressLine2}</p>
                </div>
            </div>
            <div className="text-center text-xs text-slate-500 mt-10 pt-4 border-t border-slate-700">
                <p className="mb-2">This official portal supports certificate requests, company verification, and academic service workflows.</p>
                <p>&copy; {new Date().getFullYear()} {COLLEGE_NAME}. All rights reserved.</p>
            </div>
        </footer>
    );
}
