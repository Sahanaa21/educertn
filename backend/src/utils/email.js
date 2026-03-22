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
exports.sendEmail = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dns_1 = __importDefault(require("dns"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const configuredFrom = (process.env.SMTP_FROM_EMAIL || '').trim();
const smtpUser = (process.env.SMTP_USER || '').trim();
const fromAddress = configuredFrom || smtpUser || 'noreply@gat-verification-portal.com';
const fromName = process.env.SMTP_FROM_NAME || 'Global Academy of Technology';
const configuredHost = (process.env.SMTP_HOST || '').trim();
const smtpHost = configuredHost.toLowerCase() === 'mtp-relay.brevo.com'
    ? 'smtp-relay.brevo.com'
    : (configuredHost || 'smtp-relay.brevo.com');
const forceIpv4 = (process.env.SMTP_FORCE_IPV4 || 'false').toLowerCase() === 'true';
const smtpSecureEnv = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
if (configuredHost.toLowerCase() === 'mtp-relay.brevo.com') {
    console.warn('SMTP_HOST typo detected (mtp-relay.brevo.com). Auto-correcting to smtp-relay.brevo.com.');
}
if (!configuredFrom && smtpUser) {
    console.warn('SMTP_FROM_EMAIL not set. Using SMTP_USER as sender address.');
}
if (!configuredFrom && !smtpUser) {
    console.warn('SMTP_FROM_EMAIL and SMTP_USER are not set. Using fallback sender address.');
}
const configuredPrimaryPort = Number(process.env.SMTP_PORT) || 587;
const smtpPorts = Array.from(new Set([configuredPrimaryPort, 2525, 465]));
let cachedSmtpIpv4List = null;
const resolveSmtpHosts = () => __awaiter(void 0, void 0, void 0, function* () {
    if (cachedSmtpIpv4List) {
        return forceIpv4 ? cachedSmtpIpv4List : [smtpHost, ...cachedSmtpIpv4List];
    }
    try {
        const ipv4List = yield dns_1.default.promises.resolve4(smtpHost);
        cachedSmtpIpv4List = ipv4List;
        if (forceIpv4 && ipv4List.length > 0) {
            return ipv4List;
        }
        if (ipv4List.length > 0) {
            return [smtpHost, ...ipv4List];
        }
    }
    catch (error) {
        console.warn(`IPv4 resolution failed for ${smtpHost}. Falling back to hostname.`, error instanceof Error ? error.message : error);
    }
    return [smtpHost];
});
const sendEmail = (to, subject, html, attachments) => __awaiter(void 0, void 0, void 0, function* () {
    const smtpHosts = yield resolveSmtpHosts();
    let lastError = null;
    try {
        for (const host of smtpHosts) {
            for (const port of smtpPorts) {
                try {
                    const isSecure = smtpSecureEnv || port === 465;
                    const transporter = nodemailer_1.default.createTransport({
                        host,
                        port,
                        secure: isSecure,
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASS,
                        },
                        connectionTimeout: 12000,
                        greetingTimeout: 12000,
                        socketTimeout: 15000,
                        tls: {
                            servername: smtpHost,
                        },
                    });
                    const info = yield transporter.sendMail(Object.assign({ from: `"${fromName}" <${fromAddress}>`, to,
                        subject,
                        html }, (attachments && attachments.length > 0 ? { attachments } : {})));
                    console.log(`Email sent successfully to ${to} via ${host}:${port}:`, info.messageId);
                    return info;
                }
                catch (error) {
                    lastError = error;
                    console.warn(`SMTP attempt failed on ${host}:${port}. Trying next route...`, error instanceof Error ? error.message : error);
                }
            }
        }
        throw lastError || new Error('All SMTP attempts failed');
    }
    catch (error) {
        console.error(`Email send failed for ${to}:`, error instanceof Error ? error.message : error);
        throw error;
    }
});
exports.sendEmail = sendEmail;
