type ZwitchCheckoutInput = {
    paymentToken: string;
    accessKey: string;
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

export const openZwitchCheckout = async ({ paymentToken, accessKey, environment }: ZwitchCheckoutInput): Promise<void> => {
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

    if (isSandbox && !key.startsWith('ak_test_')) {
        throw new Error('Invalid sandbox checkout key. Set ZWITCH_LAYER_ACCESS_KEY to an ak_test_* key from Developers -> API Keys.');
    }
    if (!isSandbox && !key.startsWith('ak_live_')) {
        throw new Error('Invalid live checkout key. Set ZWITCH_LAYER_ACCESS_KEY to an ak_live_* key from Developers -> API Keys.');
    }

    const layerScript = isSandbox
        ? 'https://sandbox-payments.open.money/layer'
        : 'https://payments.open.money/layer';

    await loadLayerScript(layerScript);

    const Layer = (window as any).Layer;
    if (!Layer?.checkout) {
        throw new Error('Zwitch checkout is unavailable right now');
    }

    await new Promise<void>((resolve, reject) => {
        Layer.checkout(
            {
                token,
                accesskey: key,
                theme: {
                    color: '#1f2937',
                    error_color: '#b91c1c'
                }
            },
            (response: any) => {
                const status = String(response?.status || '').toLowerCase();
                if (['captured', 'pending', 'created', 'failed', 'cancelled'].includes(status)) {
                    resolve();
                    return;
                }
                resolve();
            },
            (err: any) => reject(new Error(err?.message || 'Unable to open payment checkout'))
        );
    });
};
