"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isZwitchOrderPaid = exports.fetchZwitchOrder = exports.createZwitchOrder = exports.hasZwitchConfig = void 0;
const apiBaseUrl = (process.env.ZWITCH_API_BASE_URL || 'https://api.zwitch.io').replace(/\/$/, '');
const createOrderPath = process.env.ZWITCH_CREATE_ORDER_PATH || '/v1/payments/orders';
const fetchOrderPathTemplate = process.env.ZWITCH_FETCH_ORDER_PATH_TEMPLATE || '/v1/payments/orders/{orderId}';
const apiKey = process.env.ZWITCH_API_KEY || '';
const apiSecret = process.env.ZWITCH_API_SECRET || '';
const explicitAuthHeader = process.env.ZWITCH_AUTH_HEADER || '';
const normalizeOrderId = (order) => {
    var _a, _b;
    return String((order === null || order === void 0 ? void 0 : order.id)
        || (order === null || order === void 0 ? void 0 : order.order_id)
        || (order === null || order === void 0 ? void 0 : order.orderId)
        || ((_a = order === null || order === void 0 ? void 0 : order.data) === null || _a === void 0 ? void 0 : _a.id)
        || ((_b = order === null || order === void 0 ? void 0 : order.data) === null || _b === void 0 ? void 0 : _b.order_id)
        || '');
};
const normalizeCheckoutUrl = (order) => {
    var _a, _b, _c, _d;
    return String((order === null || order === void 0 ? void 0 : order.checkout_url)
        || (order === null || order === void 0 ? void 0 : order.checkoutUrl)
        || (order === null || order === void 0 ? void 0 : order.payment_link)
        || (order === null || order === void 0 ? void 0 : order.paymentLink)
        || (order === null || order === void 0 ? void 0 : order.short_url)
        || (order === null || order === void 0 ? void 0 : order.shortUrl)
        || ((_a = order === null || order === void 0 ? void 0 : order.links) === null || _a === void 0 ? void 0 : _a.checkout)
        || ((_b = order === null || order === void 0 ? void 0 : order.links) === null || _b === void 0 ? void 0 : _b.payment)
        || ((_c = order === null || order === void 0 ? void 0 : order.data) === null || _c === void 0 ? void 0 : _c.checkout_url)
        || ((_d = order === null || order === void 0 ? void 0 : order.data) === null || _d === void 0 ? void 0 : _d.checkoutUrl)
        || '');
};
const normalizeOrderAmount = (order) => {
    var _a;
    return Number((order === null || order === void 0 ? void 0 : order.amount) || (order === null || order === void 0 ? void 0 : order.amount_in_paise) || ((_a = order === null || order === void 0 ? void 0 : order.data) === null || _a === void 0 ? void 0 : _a.amount) || 0);
};
const normalizeOrderCurrency = (order) => {
    var _a;
    return String((order === null || order === void 0 ? void 0 : order.currency) || ((_a = order === null || order === void 0 ? void 0 : order.data) === null || _a === void 0 ? void 0 : _a.currency) || 'INR');
};
const getAuthHeader = () => {
    if (explicitAuthHeader)
        return explicitAuthHeader;
    if (apiKey && apiSecret) {
        const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        return `Basic ${token}`;
    }
    return '';
};
const buildUrl = (pathWithOrWithoutLeadingSlash) => {
    return `${apiBaseUrl}${pathWithOrWithoutLeadingSlash.startsWith('/') ? '' : '/'}${pathWithOrWithoutLeadingSlash}`;
};
const requestZwitch = (path, init) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const auth = getAuthHeader();
    if (!auth) {
        throw new Error('Zwitch credentials are not configured');
    }
    const response = yield fetch(buildUrl(path), Object.assign(Object.assign({}, init), { headers: Object.assign({ 'Content-Type': 'application/json', Authorization: auth }, (init.headers || {})) }));
    const rawText = yield response.text();
    let json = null;
    try {
        json = rawText ? JSON.parse(rawText) : null;
    }
    catch (_b) {
        json = null;
    }
    if (!response.ok) {
        const message = String((json === null || json === void 0 ? void 0 : json.message)
            || ((_a = json === null || json === void 0 ? void 0 : json.error) === null || _a === void 0 ? void 0 : _a.message)
            || (json === null || json === void 0 ? void 0 : json.error_description)
            || `Zwitch API request failed with status ${response.status}`);
        throw new Error(message);
    }
    return json;
});
const hasZwitchConfig = () => Boolean(getAuthHeader());
exports.hasZwitchConfig = hasZwitchConfig;
const createZwitchOrder = (_a) => __awaiter(void 0, [_a], void 0, function* ({ amountPaise, receipt, notes, description, customer }) {
    const payload = {
        amount: Math.round(amountPaise),
        currency: 'INR',
        receipt,
        notes: notes || {}
    };
    if (description)
        payload.description = description;
    if (customer && (customer.name || customer.email || customer.contact)) {
        payload.customer = customer;
    }
    const response = yield requestZwitch(createOrderPath, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    const order = (response === null || response === void 0 ? void 0 : response.data) || response;
    return {
        id: normalizeOrderId(order),
        amount: normalizeOrderAmount(order),
        currency: normalizeOrderCurrency(order),
        checkoutUrl: normalizeCheckoutUrl(order),
        raw: order
    };
});
exports.createZwitchOrder = createZwitchOrder;
const fetchZwitchOrder = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    const path = fetchOrderPathTemplate.replace('{orderId}', encodeURIComponent(orderId));
    const response = yield requestZwitch(path, { method: 'GET' });
    return (response === null || response === void 0 ? void 0 : response.data) || response;
});
exports.fetchZwitchOrder = fetchZwitchOrder;
const isZwitchOrderPaid = (order) => {
    const status = String((order === null || order === void 0 ? void 0 : order.status) || (order === null || order === void 0 ? void 0 : order.payment_status) || (order === null || order === void 0 ? void 0 : order.state) || '').toLowerCase();
    const paidFlag = Boolean((order === null || order === void 0 ? void 0 : order.paid) || (order === null || order === void 0 ? void 0 : order.captured) || (order === null || order === void 0 ? void 0 : order.is_paid) || (order === null || order === void 0 ? void 0 : order.amount_paid) > 0);
    return paidFlag || ['paid', 'captured', 'success', 'completed', 'processed'].includes(status);
};
exports.isZwitchOrderPaid = isZwitchOrderPaid;
