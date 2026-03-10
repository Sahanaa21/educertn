import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
const smtpUser = process.env.SMTP_USER;
const fromAddress = process.env.SMTP_FROM_EMAIL || smtpUser || 'gatvarificationportal@gmail.com';
const fromName = process.env.SMTP_FROM_NAME || 'Global Academy of Technology';
const smtpForceIPv4 = process.env.SMTP_FORCE_IPV4 === 'true';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 20000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 15000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 30000),
    // Render + Gmail can intermittently fail over IPv6; allow forcing IPv4 via env.
    ...(smtpForceIPv4 ? { family: 4 } : {}),
    auth: {
        user: smtpUser,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
    return transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        html,
        attachments,
    });
};
