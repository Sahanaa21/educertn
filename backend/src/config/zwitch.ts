type PaymentOrderOptions = {
    amountPaise: number;
    receipt: string;
    notes?: Record<string, string>;
    description?: string;
    customer?: {
        name?: string;
        email?: string;
        contact?: string;
    };
};

const apiBaseUrl = (process.env.ZWITCH_API_BASE_URL || 'https://api.zwitch.io').replace(/\/$/, '');
const createOrderPath = process.env.ZWITCH_CREATE_ORDER_PATH || '/v1/pg/sandbox/payment_token';
const fetchOrderPathTemplate = process.env.ZWITCH_FETCH_ORDER_PATH_TEMPLATE || '/v1/pg/sandbox/payment_token/{orderId}/payment';

const apiKey = process.env.ZWITCH_API_KEY || '';
const apiSecret = process.env.ZWITCH_API_SECRET || '';
const explicitAuthHeader = process.env.ZWITCH_AUTH_HEADER || '';
const checkoutAccessKey = process.env.ZWITCH_LAYER_ACCESS_KEY || process.env.ZWITCH_ACCESS_KEY || '';
const checkoutKeyPreference = String(process.env.ZWITCH_CHECKOUT_KEY_PREFERENCE || 'pg').toLowerCase();
const checkoutEnvironment = String(
    process.env.ZWITCH_CHECKOUT_ENV || (createOrderPath.includes('/sandbox/') ? 'sandbox' : 'live')
).toLowerCase();
const requestTimeoutMs = Number(process.env.ZWITCH_API_TIMEOUT_MS || 6000);

const normalizeOrderId = (order: any): string => {
    return String(
        order?.id
        || order?.order_id
        || order?.orderId
        || order?.data?.id
        || order?.data?.order_id
        || ''
    );
};

const normalizeCheckoutUrl = (order: any): string => {
    return String(
        order?.checkout_url
        || order?.checkoutUrl
        || order?.payment_link
        || order?.paymentLink
        || order?.short_url
        || order?.shortUrl
        || order?.links?.checkout
        || order?.links?.payment
        || order?.data?.checkout_url
        || order?.data?.checkoutUrl
        || ''
    );
};

const normalizeOrderAmount = (order: any): number => {
    const value = Number(order?.amount || order?.amount_in_paise || order?.data?.amount || 0);
    // PG token APIs return amount in rupees as a decimal string; normalize to paise for consistency.
    return Number.isFinite(value) ? Math.round(value * 100) : 0;
};

const normalizeOrderCurrency = (order: any): string => {
    return String(order?.currency || order?.data?.currency || 'INR');
};

const getAuthHeader = (): string => {
    if (explicitAuthHeader) return explicitAuthHeader;

    if (apiKey && apiSecret) {
        return `Bearer ${apiKey}:${apiSecret}`;
    }

    return '';
};

const buildUrl = (pathWithOrWithoutLeadingSlash: string): string => {
    return `${apiBaseUrl}${pathWithOrWithoutLeadingSlash.startsWith('/') ? '' : '/'}${pathWithOrWithoutLeadingSlash}`;
};

const requestZwitch = async (path: string, init: RequestInit): Promise<any> => {
    const auth = getAuthHeader();
    if (!auth) {
        throw new Error('Zwitch credentials are not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

    const response = await fetch(buildUrl(path), {
        ...init,
        signal: controller.signal,
        headers: {
            'Content-Type': 'application/json',
            Authorization: auth,
            ...(init.headers || {})
        }
    }).finally(() => clearTimeout(timeoutId));

    const rawText = await response.text();
    let json: any = null;

    try {
        json = rawText ? JSON.parse(rawText) : null;
    } catch {
        json = null;
    }

    if (!response.ok) {
        const message = String(
            json?.message
            || json?.error?.message
            || json?.error_description
            || `Zwitch API request failed with status ${response.status}`
        );
        throw new Error(message);
    }

    return json;
};

export const hasZwitchConfig = (): boolean => Boolean(getAuthHeader());

export const createZwitchOrder = async ({ amountPaise, receipt, notes, description, customer }: PaymentOrderOptions) => {
    const fallbackContact = String(process.env.ZWITCH_DEFAULT_CONTACT || '9999999999');
    const fallbackEmail = String(process.env.ZWITCH_DEFAULT_EMAIL || 'noreply@example.com');

    const payload: Record<string, unknown> = {
        amount: Number((amountPaise / 100).toFixed(2)),
        currency: 'INR',
        mtx: receipt,
        udf: notes || {}
    };

    if (description) payload.description = description;
    payload.contact_number = String(customer?.contact || fallbackContact).replace(/\D/g, '').slice(-10);
    payload.email_id = String(customer?.email || fallbackEmail);

    const response = await requestZwitch(createOrderPath, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    const preferLayerKey = checkoutKeyPreference === 'layer';
    const primaryCheckoutKey = preferLayerKey ? (checkoutAccessKey || apiKey) : (apiKey || checkoutAccessKey);
    const secondaryCheckoutKey = preferLayerKey ? apiKey : checkoutAccessKey;

    const order = response?.data || response;
    return {
        id: normalizeOrderId(order),
        amount: normalizeOrderAmount(order),
        currency: normalizeOrderCurrency(order),
        checkoutUrl: normalizeCheckoutUrl(order),
        accessKey: primaryCheckoutKey,
        fallbackAccessKey: secondaryCheckoutKey && secondaryCheckoutKey !== primaryCheckoutKey ? secondaryCheckoutKey : '',
        environment: checkoutEnvironment,
        raw: order
    };
};

export const fetchZwitchOrder = async (orderId: string) => {
    const path = fetchOrderPathTemplate.replace('{orderId}', encodeURIComponent(orderId));
    const response = await requestZwitch(path, { method: 'GET' });
    return response?.data || response;
};

export const isZwitchOrderPaid = (order: any): boolean => {
    const status = String(order?.status || order?.payment_status || order?.state || '').toLowerCase();
    const paidFlag = Boolean(order?.paid || order?.captured || order?.is_paid || order?.amount_paid > 0);

    return paidFlag || ['paid', 'captured', 'success', 'completed', 'processed'].includes(status);
};

export const verifyZwitchOrderPaid = async (
    orderId: string,
    options?: { maxAttempts?: number; intervalMs?: number }
) => {
    const maxAttempts = Math.max(1, Number(options?.maxAttempts || 8));
    const intervalMs = Math.max(0, Number(options?.intervalMs || 1500));

    let lastOrder: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const order = await fetchZwitchOrder(orderId);
        lastOrder = order;

        if (isZwitchOrderPaid(order)) {
            return { paid: true, order };
        }

        if (attempt < maxAttempts && intervalMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
    }

    return { paid: false, order: lastOrder };
};
