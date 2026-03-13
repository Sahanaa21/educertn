import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Global Academy of Technology - Verification Portal',
  description: 'Certificate and Background Verification Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col bg-slate-50`}>
        <Header />
        <div className="flex-1 w-full">{children}</div>
        <Footer />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
