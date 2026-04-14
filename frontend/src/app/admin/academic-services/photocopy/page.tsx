"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPhotocopyRequestsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/academic-services?serviceType=PHOTOCOPY');
    }, [router]);

    return null;
}
