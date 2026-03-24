"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentRootRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/student/apply');
    }, [router]);

    return null;
}
