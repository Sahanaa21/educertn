import { apiFetch } from '@/lib/api';

export type PaymentVerificationResult = {
	verified: boolean;
	message: string;
};

type VerifyStudentCertificatePaymentArgs = {
	requestId: string;
	zwitchOrderId: string;
	token: string;
	attempts?: number;
	intervalMs?: number;
};

type VerifyCompanyVerificationPaymentArgs = {
	requestId: string;
	zwitchOrderId: string;
	token: string;
	attempts?: number;
	intervalMs?: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function verifyStudentCertificatePaymentWithRetry({
	requestId,
	zwitchOrderId,
	token,
	attempts = 6,
	intervalMs = 4000,
}: VerifyStudentCertificatePaymentArgs): Promise<PaymentVerificationResult> {
	const normalizedRequestId = String(requestId || '').trim();
	const normalizedOrderId = String(zwitchOrderId || '').trim();
	const normalizedToken = String(token || '').trim();

	if (!normalizedRequestId || !normalizedOrderId || !normalizedToken) {
		return { verified: false, message: 'Missing payment verification details' };
	}

	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		const response = await apiFetch(`/api/student/certificates/${normalizedRequestId}/verify-payment`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${normalizedToken}`,
			},
			body: JSON.stringify({ zwitchOrderId: normalizedOrderId }),
		}, {
			timeoutMs: 15000,
			retries: 0,
		});

		const payload = await response.json().catch(() => null);
		const message = String(payload?.message || '').trim();

		if (response.ok) {
			return { verified: true, message: message || 'Payment verified successfully' };
		}

		const isStillPending = response.status === 400 && message.toLowerCase().includes('not completed yet');
		if (!isStillPending || attempt === attempts) {
			return { verified: false, message: message || 'Payment verification failed' };
		}

		await delay(intervalMs);
	}

	return { verified: false, message: 'Payment is still processing' };
}

export async function verifyCompanyVerificationPaymentWithRetry({
	requestId,
	zwitchOrderId,
	token,
	attempts = 6,
	intervalMs = 4000,
}: VerifyCompanyVerificationPaymentArgs): Promise<PaymentVerificationResult> {
	const normalizedRequestId = String(requestId || '').trim();
	const normalizedOrderId = String(zwitchOrderId || '').trim();
	const normalizedToken = String(token || '').trim();

	if (!normalizedRequestId || !normalizedOrderId || !normalizedToken) {
		return { verified: false, message: 'Missing payment verification details' };
	}

	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		const response = await apiFetch(`/api/company/verifications/${normalizedRequestId}/verify-payment`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${normalizedToken}`,
			},
			body: JSON.stringify({ zwitchOrderId: normalizedOrderId }),
		}, {
			timeoutMs: 15000,
			retries: 0,
		});

		const payload = await response.json().catch(() => null);
		const message = String(payload?.message || '').trim();

		if (response.ok) {
			return { verified: true, message: message || 'Payment verified successfully' };
		}

		const isStillPending = response.status === 400 && message.toLowerCase().includes('not completed yet');
		if (!isStillPending || attempt === attempts) {
			return { verified: false, message: message || 'Payment verification failed' };
		}

		await delay(intervalMs);
	}

	return { verified: false, message: 'Payment is still processing' };
}