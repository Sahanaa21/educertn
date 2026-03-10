import nodemailer from 'nodemailer';
import { lookup } from 'node:dns/promises';
import dotenv from 'dotenv';
dotenv.config();

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
const smtpUser = process.env.SMTP_USER;
const fromAddress = process.env.SMTP_FROM_EMAIL || smtpUser || 'gatvarificationportal@gmail.com';
const fromName = process.env.SMTP_FROM_NAME || 'Global Academy of Technology';
const smtpForceIPv4 = process.env.SMTP_FORCE_IPV4 === 'true';
const smtpHost = process.env.SMTP_HOST || '';

async function getSmtpConnectionHost(): Promise<{ host: string; servername?: string }> {
    if (!smtpForceIPv4 || !smtpHost) {
        return { host: smtpHost };
    }

    try {
        const resolved = await lookup(smtpHost, { family: 4 });
        return { host: resolved.address, servername: smtpHost };
    } catch (error) {
        console.warn('SMTP IPv4 lookup failed; falling back to hostname:', error);
        return { host: smtpHost };
    }
}

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
    const connection = await getSmtpConnectionHost();

    const transporter = nodemailer.createTransport({
        host: connection.host,
        port: smtpPort,
        secure: smtpSecure,
        connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 20000),
        greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 15000),
        socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 30000),
        // Keep IPv4 preference for Render networking edge-cases.
        ...(smtpForceIPv4 ? { family: 4 } : {}),
        ...(connection.servername ? { tls: { servername: connection.servername } } : {}),
        auth: {
            user: smtpUser,
            pass: process.env.SMTP_PASS,
        },
    });

    return transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        html,
        attachments,
    });
};
