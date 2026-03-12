import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
import nodemailer from 'nodemailer';

const configuredFrom = (process.env.SMTP_FROM_EMAIL || '').trim();
const smtpUser = (process.env.SMTP_USER || '').trim();
const fromAddress = configuredFrom || smtpUser || 'noreply@gat-verification-portal.com';
const fromName = process.env.SMTP_FROM_NAME || 'Global Academy of Technology';
const configuredHost = (process.env.SMTP_HOST || '').trim();
const smtpHost = configuredHost.toLowerCase() === 'mtp-relay.brevo.com'
    ? 'smtp-relay.brevo.com'
    : (configuredHost || 'smtp-relay.brevo.com');

if (configuredHost.toLowerCase() === 'mtp-relay.brevo.com') {
    console.warn('SMTP_HOST typo detected (mtp-relay.brevo.com). Auto-correcting to smtp-relay.brevo.com.');
}

if (!configuredFrom && smtpUser) {
    console.warn('SMTP_FROM_EMAIL not set. Using SMTP_USER as sender address.');
}

if (!configuredFrom && !smtpUser) {
    console.warn('SMTP_FROM_EMAIL and SMTP_USER are not set. Using fallback sender address.');
}

const smtpPort = Number(process.env.SMTP_PORT) || 587;

let cachedSmtpIpv4: string | null = null;

const resolveSmtpHost = async () => {
    if (cachedSmtpIpv4) {
        return cachedSmtpIpv4;
    }

    try {
        const ipv4List = await dns.promises.resolve4(smtpHost);
        if (ipv4List.length > 0) {
            cachedSmtpIpv4 = ipv4List[0];
            return cachedSmtpIpv4;
        }
    } catch (error) {
        console.warn(`IPv4 resolution failed for ${smtpHost}. Falling back to hostname.`, error instanceof Error ? error.message : error);
    }

    return smtpHost;
};

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
    try {
        const smtpConnectionHost = await resolveSmtpHost();
        const transporter = nodemailer.createTransport({
            host: smtpConnectionHost,
            port: smtpPort,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            socketTimeout: 30000,
            tls: {
                servername: smtpHost,
            },
        });

        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to,
            subject,
            html,
            ...(attachments && attachments.length > 0 ? { attachments } : {}),
        });
        console.log(`Email sent successfully to ${to}:`, info.messageId);
        return info;
    } catch (error) {
        console.error(`Email send failed for ${to}:`, error instanceof Error ? error.message : error);
        throw error;
    }
};
