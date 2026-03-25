import { redirect } from 'next/navigation';

export default function AdminReEvaluationRequestsPage() {
    redirect('/admin/academic-services?serviceType=REEVALUATION');
}
