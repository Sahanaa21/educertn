import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

const fromAddress = process.env.SMTP_FROM_EMAIL || 'noreply@gat-verification-portal.com';
const fromName = process.env.SMTP_FROM_NAME || 'Global Academy of Technology';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
    try {
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
