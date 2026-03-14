declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => {
            open: () => void;
        };
    }
}

type RazorpayOrderInput = {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
};

type RazorpayResult = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
};

const scriptUrl = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpayScript = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (window.Razorpay) return true;

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const openRazorpayCheckout = async (input: RazorpayOrderInput): Promise<RazorpayResult> => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay checkout');
    }

    return new Promise((resolve, reject) => {
        const RazorpayConstructor = window.Razorpay;
        if (!RazorpayConstructor) {
            reject(new Error('Razorpay checkout is unavailable'));
            return;
        }

        const options: Record<string, unknown> = {
            key: input.keyId,
            order_id: input.orderId,
            amount: input.amount,
            currency: input.currency,
            name: input.name,
            description: input.description,
            prefill: input.prefill || {},
            handler: (response: RazorpayResult) => resolve(response),
            modal: {
                ondismiss: () => reject(new Error('Payment cancelled by user'))
            },
            theme: {
                color: '#1e40af'
            }
        };

        const razorpay = new RazorpayConstructor(options);
        razorpay.open();
    });
};
