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

let cachedSmtpIpv4List: string[] | null = null;

const resolveSmtpHosts = async () => {
    if (cachedSmtpIpv4List) {
        return forceIpv4 ? cachedSmtpIpv4List : [smtpHost, ...cachedSmtpIpv4List];
    }

    try {
        const ipv4List = await dns.promises.resolve4(smtpHost);
        cachedSmtpIpv4List = ipv4List;
        if (forceIpv4 && ipv4List.length > 0) {
            return ipv4List;
        }
        if (ipv4List.length > 0) {
            return [smtpHost, ...ipv4List];
        }
    } catch (error) {
        console.warn(`IPv4 resolution failed for ${smtpHost}. Falling back to hostname.`, error instanceof Error ? error.message : error);
    }

    return [smtpHost];
};

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
    const smtpHosts = await resolveSmtpHosts();
    let lastError: unknown = null;

    try {
        for (const host of smtpHosts) {
            for (const port of smtpPorts) {
                try {
                    const isSecure = smtpSecureEnv || port === 465;
                    const transporter = nodemailer.createTransport({
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

                    const info = await transporter.sendMail({
                        from: `"${fromName}" <${fromAddress}>`,
                        to,
                        subject,
                        html,
                        ...(attachments && attachments.length > 0 ? { attachments } : {}),
                    });

                    console.log(`Email sent successfully to ${to} via ${host}:${port}:`, info.messageId);
                    return info;
                } catch (error) {
                    lastError = error;
                    console.warn(`SMTP attempt failed on ${host}:${port}. Trying next route...`, error instanceof Error ? error.message : error);
                }
            }
        }

        throw lastError || new Error('All SMTP attempts failed');
    } catch (error) {
        console.error(`Email send failed for ${to}:`, error instanceof Error ? error.message : error);
        throw error;
    }
};
