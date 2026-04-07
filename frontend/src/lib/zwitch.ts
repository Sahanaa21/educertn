type ZwitchCheckoutInput = {
    paymentToken: string;
    accessKey: string;
    fallbackAccessKey?: string;
    environment?: 'sandbox' | 'live';
};

const loadLayerScript = async (src: string): Promise<void> => {
    if (typeof window === 'undefined') {
        throw new Error('Checkout is available only in browser');
    }

    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing && (window as any).Layer?.checkout) return;

    await new Promise<void>((resolve, reject) => {
        const script = existing || document.createElement('script');
        if (!existing) {
            script.src = src;
            script.async = true;
            document.body.appendChild(script);
        }
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Zwitch checkout script'));
    });
};

export const openZwitchCheckout = async ({ paymentToken, accessKey, fallbackAccessKey, environment }: ZwitchCheckoutInput): Promise<void> => {
    if (typeof window === 'undefined') {
        throw new Error('Checkout is available only in browser');
    }

    const token = String(paymentToken || '').trim();
    const key = String(accessKey || '').trim();
    if (!token || !key) {
        throw new Error('Payment token or access key missing from payment provider response');
    }

    const isSandboxByToken = token.startsWith('sb_pt_');
    const isSandbox = environment ? environment === 'sandbox' : isSandboxByToken;

    const layerScript = isSandbox
        ? 'https://sandbox-payments.open.money/layer'
        : 'https://payments.open.money/layer';

    await loadLayerScript(layerScript);

    const Layer = (window as any).Layer;
    if (!Layer?.checkout) {
        throw new Error('Zwitch checkout is unavailable right now');
    }

    const triggerCheckout = async (candidateKey: string): Promise<void> => {
        await new Promise<void>((resolve, reject) => {
            Layer.checkout(
                {
                    token,
                    accesskey: candidateKey,
                    theme: {
                        color: '#1f2937',
                        error_color: '#b91c1c'
                    }
                },
                () => resolve(),
                (err: any) => reject(new Error(err?.message || 'Unable to open payment checkout'))
            );
        });
    };

    try {
        await triggerCheckout(key);
    } catch (primaryErr: any) {
        const errMessage = String(primaryErr?.message || '').toLowerCase();
        const fallbackKey = String(fallbackAccessKey || '').trim();
        if (fallbackKey && errMessage.includes('accesskey')) {
            await triggerCheckout(fallbackKey);
            return;
        }
        throw primaryErr;
    }
};
