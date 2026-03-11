import nodemailer from 'nodemailer';
import { lookup } from 'node:dns/promises';
import dotenv from 'dotenv';
dotenv.config();

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecureEnv = (process.env.SMTP_SECURE || '').toLowerCase();
const smtpSecure = smtpPort === 465
    ? true
    : smtpSecureEnv === 'true' && smtpPort !== 587;
const smtpUser = process.env.SMTP_USER;
const fromAddress = process.env.SMTP_FROM_EMAIL || smtpUser || 'gatvarificationportal@gmail.com';
const fromName = (process.env.SMTP_FROM_NAME || 'Global Academy of Technology').replace(/^['"]|['"]$/g, '');
const smtpForceIPv4 = process.env.SMTP_FORCE_IPV4 === 'true';
const smtpHost = process.env.SMTP_HOST || '';
const smtpConnectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 20000);
const smtpGreetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 15000);
const smtpSocketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 30000);

type SmtpCandidate = {
    host: string;
    port: number;
    secure: boolean;
};

async function resolveSmtpHost(host: string): Promise<{ host: string; servername?: string }> {
    if (!smtpForceIPv4 || !host) {
        return { host };
    }

    try {
        const resolved = await lookup(host, { family: 4 });
        return { host: resolved.address, servername: host };
    } catch (error) {
        console.warn('SMTP IPv4 lookup failed; falling back to hostname:', error);
        return { host };
    }
}

function getSmtpCandidates(): SmtpCandidate[] {
    const candidates: SmtpCandidate[] = [
        { host: smtpHost, port: smtpPort, secure: smtpSecure },
        { host: smtpHost || 'smtp.gmail.com', port: 465, secure: true },
        { host: 'smtp.gmail.com', port: 465, secure: true },
        { host: 'smtp.gmail.com', port: 587, secure: false },
    ];

    const seen = new Set<string>();
    return candidates.filter((candidate) => {
        if (!candidate.host) return false;
        const key = `${candidate.host}:${candidate.port}:${candidate.secure}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
    const candidates = getSmtpCandidates();
    let lastError: unknown;

    for (const candidate of candidates) {
        try {
            const resolvedHost = await resolveSmtpHost(candidate.host);

            const transporter = nodemailer.createTransport({
                host: resolvedHost.host,
                port: candidate.port,
                secure: candidate.secure,
                connectionTimeout: smtpConnectionTimeout,
                greetingTimeout: smtpGreetingTimeout,
                socketTimeout: smtpSocketTimeout,
                ...(smtpForceIPv4 ? { family: 4 } : {}),
                ...(resolvedHost.servername ? { tls: { servername: resolvedHost.servername } } : {}),
                auth: {
                    user: smtpUser,
                    pass: process.env.SMTP_PASS,
                },
            });

            return await transporter.sendMail({
                from: `"${fromName}" <${fromAddress}>`,
                to,
                subject,
                html,
                attachments,
            });
        } catch (error) {
            lastError = error;
            console.error(`SMTP candidate failed (${candidate.host}:${candidate.port}, secure=${candidate.secure}):`, error);
        }
    }

    throw lastError instanceof Error ? lastError : new Error('All SMTP candidates failed');
};
