"use client";

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportClientError } from '@/lib/errorReporter';

export default function GlobalErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportClientError(error, {
            category: 'global_error_page',
            digest: error.digest || null,
            path: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        });
    }, [error]);

    return (
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10 sm:px-8">
            <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-md">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-6 w-6 text-amber-500" />
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
                        <p className="mt-2 text-sm text-slate-600">
                            An unexpected error occurred. Please retry. If this keeps happening, use the Report Issue page.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button onClick={reset} className="bg-blue-700 text-white hover:bg-blue-800">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
                    </Button>
                </div>
            </div>
        </div>
    );
}
