"use client";

import AcademicServiceRequestsTable from '@/components/admin/AcademicServiceRequestsTable';

export default function AdminPhotocopyRequestsPage() {
    return (
        <AcademicServiceRequestsTable
            serviceType="PHOTOCOPY"
            title="Photocopy Requests"
            description="Manage photocopy requests and upload both answer sheet copy and course evaluation scheme files."
        />
    );
}
