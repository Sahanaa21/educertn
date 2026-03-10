import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
const smtpUser = process.env.SMTP_USER;
const fromAddress = process.env.SMTP_FROM_EMAIL || smtpUser || 'gatvarificationportal@gmail.com';
const fromName = process.env.SMTP_FROM_NAME || 'Global Academy of Technology';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure,
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
