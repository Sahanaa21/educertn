import { redirect } from 'next/navigation';

export default function AdminPhotocopyRequestsPage() {
    redirect('/admin/academic-services?serviceType=PHOTOCOPY');
}
