export default function Footer() {
    return (
        <footer className="mt-auto w-full border-t-4 border-amber-500 bg-slate-900 py-10 text-white">
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4 sm:px-8">
                <div>
                    <h3 className="mb-4 text-xl font-bold text-amber-300">Global Academy of Technology</h3>
                    <p className="text-sm text-slate-300">Aditya Layout, Rajarajeshwari Nagar</p>
                    <p className="text-sm text-slate-300">Bengaluru, Karnataka 560098</p>
                    <p className="mt-2 text-sm text-slate-300">Official College Portal for Student and Verification Services</p>
                </div>
                <div>
                    <h3 className="mb-4 text-lg font-bold text-amber-300">Quick Links</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                        <li><a href="/student" className="hover:text-white hover:underline transition-all">Student Portal</a></li>
                        <li><a href="/company" className="hover:text-white hover:underline transition-all">Company Verification</a></li>
                        <li><a href="/report-issue" className="hover:text-white hover:underline transition-all">Report an Issue</a></li>
                    </ul>
                </div>
                <div id="contact">
                    <h3 className="mb-4 text-lg font-bold text-amber-300">Contact Information</h3>
                    <p className="text-sm text-slate-300">Email: gatcoedex@gmail.com</p>
                    <p className="text-sm text-slate-300">Phone: 080-28603158/57</p>
                    <p className="text-sm text-slate-300">Address: Aditya Layout, Rajarajeshwari Nagar, Bengaluru, Karnataka 560098</p>
                </div>
            </div>
            <div className="text-center text-xs text-slate-500 mt-10 pt-4 border-t border-slate-700">
                <p className="mb-2">This official portal supports certificate requests, company verification, and academic service workflows.</p>
                <p>&copy; {new Date().getFullYear()} Global Academy of Technology. All rights reserved.</p>
            </div>
        </footer>
    );
}
