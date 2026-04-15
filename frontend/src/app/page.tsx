"use client";

import { useEffect, useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { GraduationCap, Building2, SearchCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { COLLEGE_CONTACT, COLLEGE_NAME, PORTAL_NAME, PORTAL_SERVICES_LABEL } from '@/lib/branding';

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
    <div className="flex w-full flex-col">
      {/* Hero Section */}
      <section
        className="relative flex w-full items-center justify-center overflow-hidden bg-cover bg-center py-16 lg:py-24"
        style={{ backgroundImage: "url('/college.image.png')" }}
      >
        <div className="absolute inset-0 bg-slate-950/70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.35),rgba(15,23,42,0.05)_45%,rgba(2,6,23,0.85)_90%)]" />

        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-amber-400/40 bg-amber-300/10 px-3 py-1 text-sm font-medium text-amber-200">
            <span className="mr-2 flex h-2 w-2 rounded-full bg-amber-300"></span>
            {PORTAL_NAME}
          </div>

          <h1 className="mx-auto mb-6 max-w-5xl text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {COLLEGE_NAME}
            <span className="mt-2 block text-amber-300">{PORTAL_SERVICES_LABEL}</span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg text-blue-100 sm:text-xl">
            A single, secure platform for student certificate requests, company background verification, academic service applications, and request status tracking.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/student/apply" className="inline-flex h-12 w-full items-center justify-center rounded-md bg-amber-400 px-8 font-bold text-blue-950 transition-colors hover:bg-amber-300 sm:w-auto">
              Apply for Certificate
            </Link>
            <Link href="/company" className="inline-flex h-12 w-full items-center justify-center rounded-md border-2 border-blue-300 bg-transparent px-8 font-medium text-white transition-colors hover:bg-blue-800 hover:text-white sm:w-auto">
              Start Verification
            </Link>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 rounded-2xl border border-white/15 bg-slate-900/35 p-4 text-left backdrop-blur-sm sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-200">Institution</p>
              <p className="text-sm font-semibold text-white">{COLLEGE_NAME}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-200">Official Email</p>
              <p className="text-sm font-semibold text-white">{COLLEGE_CONTACT.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-200">Helpline</p>
              <p className="text-sm font-semibold text-white">{COLLEGE_CONTACT.phone}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="w-full bg-linear-to-b from-slate-50 to-white py-16 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Services Available in the Official College Portal</h2>
            <p className="mx-auto mt-4 max-w-3xl text-slate-600">Designed for students, companies, and academic administration teams with secure, trackable workflows.</p>
            <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-amber-500" />
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">

            <Card className="flex flex-col border-none shadow-lg hover:shadow-xl transition-shadow bg-white overflow-hidden group">
              <div className="h-2 w-full bg-blue-600"></div>
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap size={24} />
                </div>
                <CardTitle className="text-xl">Student Services</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  Apply for grade card correction, duplicate grade cards, transcripts, PDC, course completion, no backlog, and other certificates through a guided online process.
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
                  Submit verification requests, upload required company templates, and track progress in one secure workflow.
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
                  Apply for photocopy and challenge re-evaluation services during the active window announced by the administration office.
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
