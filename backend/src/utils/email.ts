import dotenv from 'dotenv';
dotenv.config();

import sgMail from '@sendgrid/mail';

const sendGridApiKey = process.env.SENDGRID_API_KEY;

if (!sendGridApiKey) {
    console.warn('Warning: SENDGRID_API_KEY not configured. Email delivery will fail.');
} else {
    sgMail.setApiKey(sendGridApiKey);
}

const fromAddress = process.env.SMTP_FROM_EMAIL || 'noreply@gat-verification-portal.com';
const fromName = process.env.SMTP_FROM_NAME || 'Global Academy of Technology';

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
    if (!sendGridApiKey) {
        throw new Error('SendGrid API key not configured. Cannot send email.');
    }

    try {
        const msg = {
            to,
            from: {
                email: fromAddress,
                name: fromName,
            },
            subject,
            html,
            ...(attachments && attachments.length > 0 ? { attachments } : {}),
        };

        const response = await sgMail.send(msg as any);
        console.log(`Email sent successfully to ${to}:`, response[0].statusCode);
        return response;
    } catch (error) {
        console.error(`SendGrid email send failed for ${to}:`, error instanceof Error ? error.message : error);
        throw error;
    }
};
