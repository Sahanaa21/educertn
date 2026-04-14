"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminReEvaluationRequestsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/academic-services?serviceType=REEVALUATION');
    }, [router]);

    return null;
}
