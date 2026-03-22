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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpaySignature = exports.createRazorpayRefund = exports.fetchLatestCapturedPaymentForOrder = exports.fetchRazorpayOrder = exports.createRazorpayOrder = exports.getRazorpayKeyId = exports.hasRazorpayConfig = void 0;
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
const hasRazorpayConfig = () => Boolean(keyId && keySecret);
exports.hasRazorpayConfig = hasRazorpayConfig;
const getRazorpayKeyId = () => keyId;
exports.getRazorpayKeyId = getRazorpayKeyId;
const getClient = () => {
    if (!(0, exports.hasRazorpayConfig)()) {
        throw new Error('Razorpay keys are not configured');
    }
    return new razorpay_1.default({
        key_id: keyId,
        key_secret: keySecret
    });
};
const createRazorpayOrder = (_a) => __awaiter(void 0, [_a], void 0, function* ({ amountPaise, receipt, notes }) {
    const razorpay = getClient();
    return razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        payment_capture: true,
        notes
    });
});
exports.createRazorpayOrder = createRazorpayOrder;
const fetchRazorpayOrder = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    const razorpay = getClient();
    return razorpay.orders.fetch(orderId);
});
exports.fetchRazorpayOrder = fetchRazorpayOrder;
const fetchLatestCapturedPaymentForOrder = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    const razorpay = getClient();
    const paymentsResponse = yield razorpay.orders.fetchPayments(orderId);
    const items = Array.isArray(paymentsResponse === null || paymentsResponse === void 0 ? void 0 : paymentsResponse.items) ? paymentsResponse.items : [];
    const captured = items
        .filter((payment) => payment && (payment.status === 'captured' || Boolean(payment.captured)))
        .sort((a, b) => Number((b === null || b === void 0 ? void 0 : b.created_at) || 0) - Number((a === null || a === void 0 ? void 0 : a.created_at) || 0));
    return captured[0] || null;
});
exports.fetchLatestCapturedPaymentForOrder = fetchLatestCapturedPaymentForOrder;
const createRazorpayRefund = (paymentId, amountPaise) => __awaiter(void 0, void 0, void 0, function* () {
    const razorpay = getClient();
    const payload = {};
    if (typeof amountPaise === 'number' && amountPaise > 0) {
        payload.amount = Math.round(amountPaise);
    }
    return razorpay.payments.refund(paymentId, payload);
});
exports.createRazorpayRefund = createRazorpayRefund;
const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
    if (!(0, exports.hasRazorpayConfig)()) {
        return false;
    }
    const payload = `${orderId}|${paymentId}`;
    const expected = crypto_1.default.createHmac('sha256', keySecret).update(payload).digest('hex');
    return expected === signature;
};
exports.verifyRazorpaySignature = verifyRazorpaySignature;
