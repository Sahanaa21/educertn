"use client";

import AcademicServiceRequestsTable from '@/components/admin/AcademicServiceRequestsTable';

export default function AdminReEvaluationRequestsPage() {
    return (
        <AcademicServiceRequestsTable
            serviceType="REEVALUATION"
            title="Re-evaluation Requests"
            description="Manage challenge re-evaluation requests and publish final results with summary."
        />
    );
}
