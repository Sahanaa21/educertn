import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white text-slate-800 shadow-sm transition-all duration-300">
            <div className="container mx-auto flex h-24 items-center justify-start px-4 sm:px-8">
                <div className="flex min-w-0 items-center gap-0">
                    <Link href="/" className="shrink-0 -mr-8 sm:-mr-10 lg:-mr-12">
                        <div className="relative h-16 w-48 sm:h-18 sm:w-64 lg:h-20 lg:w-72">
                            <Image
                                src="/logo.png?v=20260310"
                                alt="Global Academy of Technology Logo"
                                fill
                                unoptimized
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </Link>
                    <div className="hidden md:flex min-w-0 -ml-18 lg:-ml-22 flex-col justify-center text-left leading-tight">
                        <span className="text-lg lg:text-xl font-bold text-blue-950 uppercase tracking-wide">Global Academy of Technology</span>
                        <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide mt-0.5">Certificate & Verification Portal</span>
                    </div>
                </div>
                <nav className="ml-auto hidden lg:flex gap-6 font-semibold text-sm">
                    <Link href="/" className="hover:text-yellow-500 transition-colors">Home</Link>
                    <Link href="/student" className="hover:text-yellow-500 transition-colors">Student Services</Link>
                    <Link href="/company" className="hover:text-yellow-500 transition-colors">Company Verification</Link>
                    <Link href="/report-issue" className="hover:text-yellow-500 transition-colors">Report Issue</Link>
                    <Link href="#contact" className="hover:text-yellow-500 transition-colors">Contact</Link>
                </nav>
            </div>
        </header>
    );
}
