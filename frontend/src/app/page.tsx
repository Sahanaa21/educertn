"use client";

import { useEffect, useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { GraduationCap, Building2, SearchCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type AcademicAvailability = {
  active: boolean;
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
};

export default function Home() {
  const router = useRouter();
  const [academicAvailability, setAcademicAvailability] = useState<AcademicAvailability | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const companyToken = sessionStorage.getItem('companyToken');
    
    if (token) {
      router.replace('/student');
      return;
    }
    
    if (companyToken) {
      router.replace('/company');
      return;
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
      try {
        const res = await apiFetch('/api/academic-services/availability');
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (isMounted) {
          setAcademicAvailability(data);
        }
      } catch {
        // Keep the section hidden if the service status is unavailable.
      }
    };

    void loadAvailability();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section
        className="relative w-full overflow-hidden py-16 lg:py-24 flex items-center justify-center bg-center bg-cover"
        style={{ backgroundImage: "url('/college.image.png')" }}
      >
        <div className="absolute inset-0 bg-slate-950/65"></div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm font-medium text-yellow-400 mb-6 transition-colors hover:bg-yellow-500/20">
            <span className="flex h-2 w-2 rounded-full bg-yellow-500 mr-2"></span>
            GATDEX Platform
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl mb-6">
            GATDEX
            <span className="block text-yellow-500 mt-2">Certificate, Verification & Academic Services</span>
          </h1>

          <p className="mx-auto max-w-3xl text-lg text-blue-100 sm:text-xl mb-10">
            A unified portal for certificate requests, company verification, academic service applications, secure payments, and live request tracking.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/student/apply" className="inline-flex items-center justify-center rounded-md font-bold transition-colors bg-yellow-500 text-blue-950 hover:bg-yellow-400 w-full sm:w-auto h-12 px-8">
              Apply for Certificate
            </Link>
            <Link href="/company" className="inline-flex items-center justify-center rounded-md font-medium transition-colors text-white border-2 border-blue-400 hover:bg-blue-800 hover:text-white w-full sm:w-auto h-12 px-8 bg-transparent">
              Start Verification
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="w-full py-16 pb-12 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-center">Everything You Can Do in GATDEX</h2>
            <div className="mt-4 h-1 w-20 bg-yellow-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-6xl mx-auto">

            <Card className="flex flex-col border-none shadow-lg hover:shadow-xl transition-shadow bg-white overflow-hidden group">
              <div className="h-2 w-full bg-blue-600"></div>
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap size={24} />
                </div>
                <CardTitle className="text-xl">Student Services</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  Apply for grade card correction, duplicate grade cards, transcripts, PDC, course completion, no backlog, and other certificates online.
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-6 border-t bg-slate-50">
                <Link href="/student" className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800">
                  Access Student Portal <ArrowRight size={16} className="ml-2" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="flex flex-col border-none shadow-lg hover:shadow-xl transition-shadow bg-white overflow-hidden group">
              <div className="h-2 w-full bg-yellow-500"></div>
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-700 mb-4 group-hover:scale-110 transition-transform">
                  <Building2 size={24} />
                </div>
                <CardTitle className="text-xl">Company Verification</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  Submit background verification requests, upload company templates, and track completion securely from one place.
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-6 border-t bg-slate-50">
                <Link href="/company" className="inline-flex items-center text-sm font-semibold text-yellow-700 hover:text-yellow-800">
                  Submit Verification Request <ArrowRight size={16} className="ml-2" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="flex flex-col border-none shadow-lg hover:shadow-xl transition-shadow bg-white overflow-hidden group">
              <div className="h-2 w-full bg-emerald-500"></div>
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
                  <SearchCheck size={24} />
                </div>
                <CardTitle className="text-xl">Academic Services</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  Apply for photocopy and challenge re-evaluation services during the active request window announced by the admin office.
                </CardDescription>
                <p className={`text-sm font-semibold mt-2 ${academicAvailability?.active ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {academicAvailability?.active ? 'Status: OPEN NOW' : 'Status: CURRENTLY CLOSED'}
                </p>
              </CardHeader>
              <CardFooter className="mt-auto pt-6 border-t bg-slate-50">
                <Link
                  href={academicAvailability?.active ? '/student/academic-services' : '/auth'}
                  className={`inline-flex items-center text-sm font-semibold ${academicAvailability?.active ? 'text-emerald-700 hover:text-emerald-800' : 'text-slate-600 hover:text-slate-700'}`}
                >
                  {academicAvailability?.active ? 'Apply for Academic Services' : 'Sign in to Check Availability'} <ArrowRight size={16} className="ml-2" />
                </Link>
              </CardFooter>
            </Card>



          </div>
        </div>
      </section>

    </div>
  );
}
