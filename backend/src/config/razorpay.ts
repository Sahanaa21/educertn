import crypto from 'crypto';
import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

export const hasRazorpayConfig = (): boolean => Boolean(keyId && keySecret);

export const getRazorpayKeyId = (): string => keyId;

const getClient = (): Razorpay => {
    if (!hasRazorpayConfig()) {
        throw new Error('Razorpay keys are not configured');
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    });
};

type OrderOptions = {
    amountPaise: number;
    receipt: string;
    notes?: Record<string, string>;
};

export const createRazorpayOrder = async ({ amountPaise, receipt, notes }: OrderOptions) => {
    const razorpay = getClient();

    return razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        payment_capture: true,
        notes
    });
};

export const fetchRazorpayOrder = async (orderId: string) => {
    const razorpay = getClient();
    return razorpay.orders.fetch(orderId);
};

export const fetchLatestCapturedPaymentForOrder = async (orderId: string): Promise<any | null> => {
    const razorpay = getClient();
    const paymentsResponse = await (razorpay as any).orders.fetchPayments(orderId);
    const items = Array.isArray(paymentsResponse?.items) ? paymentsResponse.items : [];

    const captured = items
        .filter((payment: any) => payment && (payment.status === 'captured' || Boolean(payment.captured)))
        .sort((a: any, b: any) => Number(b?.created_at || 0) - Number(a?.created_at || 0));

    return captured[0] || null;
};

export const createRazorpayRefund = async (paymentId: string, amountPaise?: number): Promise<any> => {
    const razorpay = getClient();
    const payload: Record<string, unknown> = {};

    if (typeof amountPaise === 'number' && amountPaise > 0) {
        payload.amount = Math.round(amountPaise);
    }

    return (razorpay as any).payments.refund(paymentId, payload);
};

export const verifyRazorpaySignature = ({
    orderId,
    paymentId,
    signature
}: {
    orderId: string;
    paymentId: string;
    signature: string;
}): boolean => {
    if (!hasRazorpayConfig()) {
        return false;
    }

    const payload = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');
    return expected === signature;
};
