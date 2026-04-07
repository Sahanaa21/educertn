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
const createOrderPath = process.env.ZWITCH_CREATE_ORDER_PATH || '/v1/payments/orders';
const fetchOrderPathTemplate = process.env.ZWITCH_FETCH_ORDER_PATH_TEMPLATE || '/v1/payments/orders/{orderId}';

const apiKey = process.env.ZWITCH_API_KEY || '';
const apiSecret = process.env.ZWITCH_API_SECRET || '';
const explicitAuthHeader = process.env.ZWITCH_AUTH_HEADER || '';

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
    return Number(order?.amount || order?.amount_in_paise || order?.data?.amount || 0);
};

const normalizeOrderCurrency = (order: any): string => {
    return String(order?.currency || order?.data?.currency || 'INR');
};

const getAuthHeader = (): string => {
    if (explicitAuthHeader) return explicitAuthHeader;

    if (apiKey && apiSecret) {
        const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        return `Basic ${token}`;
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

    const response = await fetch(buildUrl(path), {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: auth,
            ...(init.headers || {})
        }
    });

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
    const payload: Record<string, unknown> = {
        amount: Math.round(amountPaise),
        currency: 'INR',
        receipt,
        notes: notes || {}
    };

    if (description) payload.description = description;
    if (customer && (customer.name || customer.email || customer.contact)) {
        payload.customer = customer;
    }

    const response = await requestZwitch(createOrderPath, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    const order = response?.data || response;
    return {
        id: normalizeOrderId(order),
        amount: normalizeOrderAmount(order),
        currency: normalizeOrderCurrency(order),
        checkoutUrl: normalizeCheckoutUrl(order),
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
