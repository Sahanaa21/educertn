type ZwitchCheckoutInput = {
    checkoutUrl: string;
};

export const openZwitchCheckout = async ({ checkoutUrl }: ZwitchCheckoutInput): Promise<void> => {
    if (typeof window === 'undefined') {
        throw new Error('Checkout is available only in browser');
    }

    const url = String(checkoutUrl || '').trim();
    if (!url) {
        throw new Error('Checkout URL is missing from payment provider response');
    }

    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
        window.location.href = url;
        return;
    }
};
