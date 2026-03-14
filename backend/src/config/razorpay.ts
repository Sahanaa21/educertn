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
