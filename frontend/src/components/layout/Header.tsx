import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white text-slate-800 shadow-sm transition-all duration-300">
            <div className="container mx-auto flex h-[100px] items-center justify-between px-4 sm:px-8">
                <div className="flex items-center gap-6">
                    <Link href="/">
                        <div className="relative h-[85px] w-[250px] sm:w-[380px]">
                            <Image src="/logo.png" alt="Global Academy of Technology Logo" fill className="object-contain object-left" priority />
                        </div>
                    </Link>
                    <div className="h-12 border-l-2 border-slate-200 hidden md:block"></div>
                    <div className="hidden lg:flex flex-col justify-center">
                        <span className="text-base lg:text-lg font-bold text-blue-950 uppercase tracking-widest">Global Academy of Technology</span>
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider mt-0.5">Certificate & Verification Portal</span>
                    </div>
                </div>
                <nav className="hidden lg:flex gap-6 font-semibold text-sm">
                    <Link href="/" className="hover:text-yellow-500 transition-colors">Home</Link>
                    <Link href="/student" className="hover:text-yellow-500 transition-colors">Student Services</Link>
                    <Link href="/company" className="hover:text-yellow-500 transition-colors">Company Verification</Link>
                    <Link href="#contact" className="hover:text-yellow-500 transition-colors">Contact</Link>
                </nav>
            </div>
        </header>
    );
}
