import Link from 'next/link';
import { BadgeCheck, CircleX, ExternalLink, Home, ListChecks } from 'lucide-react';

type PageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const normalize = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) return value[0] || '';
    return String(value || '');
};

const statusLabel = (value: string) => value.replace(/_/g, ' ').trim();

export default async function IssueMailActionPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const ok = normalize(params.ok) === '1';
    const issueId = normalize(params.issueId);
    const status = normalize(params.status).toUpperCase();
    const message = normalize(params.message) || (ok ? 'Issue status updated' : 'Could not update issue status');

    return (
        <div className="relative overflow-hidden bg-linear-to-br from-slate-100 via-emerald-50 to-blue-100 px-4 py-16 sm:px-8">
            <div className="pointer-events-none absolute -top-20 -left-10 h-60 w-60 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />

            <div className="relative mx-auto max-w-2xl rounded-2xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur sm:p-8">
                <div className="flex items-center gap-3">
                    {ok ? (
                        <BadgeCheck className="h-9 w-9 text-emerald-600" />
                    ) : (
                        <CircleX className="h-9 w-9 text-red-600" />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {ok ? 'Issue Updated' : 'Action Not Completed'}
                        </h1>
                        <p className="text-sm text-slate-600">{message}</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 rounded-xl bg-slate-100/80 p-4 text-sm sm:grid-cols-2">
                    <div>
                        <p className="text-slate-500">Issue ID</p>
                        <p className="break-all font-semibold text-slate-900">{issueId || 'Not provided'}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Status</p>
                        <p className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wider ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                            {status ? statusLabel(status) : 'Unknown'}
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">What next?</p>
                    <p>If you are a developer/admin, verify the updated issue in the admin panel to continue tracking and closure workflow.</p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href="/admin/issues"
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        <ListChecks className="h-4 w-4" />
                        Open Admin Issues
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        <Home className="h-4 w-4" />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
