export default function Footer() {
    return (
        <footer className="w-full bg-slate-900 py-10 text-white mt-auto border-t-4 border-yellow-500">
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4 sm:px-8">
                <div>
                    <h3 className="text-xl font-bold mb-4 text-yellow-400">Global Academy of Technology</h3>
                    <p className="text-sm text-slate-300">Rajarajeshwari Nagar</p>
                    <p className="text-sm text-slate-300">Off Mysore Road</p>
                    <p className="text-sm text-slate-300">Bangalore &ndash; 560098</p>
                    <p className="text-sm text-slate-300">Karnataka, India</p>
                </div>
                <div>
                    <h3 className="text-lg font-bold mb-4 text-yellow-400">Quick Links</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                        <li><a href="/student" className="hover:text-white hover:underline transition-all">Student Portal</a></li>
                        <li><a href="/company" className="hover:text-white hover:underline transition-all">Company Verification</a></li>
                        <li><a href="/report-issue" className="hover:text-white hover:underline transition-all">Report an Issue</a></li>
                    </ul>
                </div>
                <div id="contact">
                    <h3 className="text-lg font-bold mb-4 text-yellow-400">Contact Information</h3>
                    <p className="text-sm text-slate-300">Email: gatvarification@gmail.com</p>
                    <p className="text-sm text-slate-300">Phone: +91-80-28603158</p>
                </div>
            </div>
            <div className="text-center text-xs text-slate-500 mt-10 pt-4 border-t border-slate-700">
                <p className="mb-2">This portal is designed for secure certificate requests and academic verification services.</p>
                <p>&copy; {new Date().getFullYear()} Global Academy of Technology. All rights reserved.</p>
            </div>
        </footer>
    );
}
