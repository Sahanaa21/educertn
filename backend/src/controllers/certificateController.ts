import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { sendEmail } from '../utils/email';
import { escapeHtml } from '../utils/html';
import { getUploadedFileUrl, sendStoredFile } from '../utils/fileStorage';
import {
    createZwitchOrder,
    hasZwitchConfig,
    verifyZwitchOrderPaid
} from '../config/zwitch';
import { generateRequestId } from '../utils/generateId';

const formatEnumValue = (value: string | null | undefined) => {
    return String(value || '')
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
};

const sendCertificateConfirmationEmails = async (requestId: string) => {
    const request = await prisma.certificateRequest.findUnique({
        where: { id: requestId },
        include: {
            user: {
                select: {
                    email: true,
                    name: true,
                }
            }
        }
    });

    if (!request) return;

    const adminEmail = String(process.env.ADMIN_ALERT_EMAIL || '').trim();
    const safeRequestId = escapeHtml(request.id);
    const safeStudentName = escapeHtml(request.studentName || request.user?.name || 'Student');
    const safeType = escapeHtml(formatEnumValue(request.certificateType));
    const safeCopyType = escapeHtml(formatEnumValue(request.copyType));

    if (request.user?.email) {
        const studentHtml = `
            <h2>Certificate Request Received</h2>
            <p>Hello ${safeStudentName},</p>
            <p>Your certificate request has been received by the admin team and is now in processing queue.</p>
            <p><strong>Request ID:</strong> ${safeRequestId}</p>
            <p><strong>Certificate Type:</strong> ${safeType}</p>
            <p><strong>Delivery Mode:</strong> ${safeCopyType}</p>
            <p><strong>Payment Status:</strong> Paid</p>
            <p>We will process your request soon. You can track status in the portal and download your acknowledgement document from My Requests.</p>
            <p>Thank you,<br/>Global Academy of Technology</p>
        `;

        void sendEmail(
            request.user.email,
            `Request Received - ${request.id}`,
            studentHtml
        ).catch((emailErr) => {
            console.error('Failed to send certificate confirmation email to student:', emailErr);
        });
    }

    if (adminEmail) {
        const adminHtml = `
            <h2>New Paid Certificate Request</h2>
            <p>A new certificate request has been successfully submitted and paid.</p>
            <p><strong>Request ID:</strong> ${safeRequestId}</p>
            <p><strong>Student:</strong> ${safeStudentName}</p>
            <p><strong>Certificate Type:</strong> ${safeType}</p>
            <p><strong>Delivery Mode:</strong> ${safeCopyType}</p>
            <p><strong>Amount:</strong> INR ${Number(request.amount || 0).toFixed(2)}</p>
        `;

        void sendEmail(
            adminEmail,
            `New Certificate Request - ${request.id}`,
            adminHtml
        ).catch((emailErr) => {
            console.error('Failed to send certificate confirmation email to admin:', emailErr);
        });
    }
};

const resolveStoredFilePath = (storedPath: string | null | undefined): string | null => {
    if (!storedPath) return null;

    const direct = path.isAbsolute(storedPath) ? storedPath : path.resolve(process.cwd(), storedPath);
    if (fs.existsSync(direct)) return direct;

    const normalized = storedPath.replace(/\\/g, '/');
    const uploadsIndex = normalized.lastIndexOf('/uploads/');
    if (uploadsIndex >= 0) {
        const relativeFromUploads = normalized.slice(uploadsIndex + 1);
        const candidate = path.resolve(process.cwd(), relativeFromUploads);
        if (fs.existsSync(candidate)) return candidate;
    }

    const fallbackByName = path.resolve(process.cwd(), 'uploads', path.basename(normalized));
    if (fs.existsSync(fallbackByName)) return fallbackByName;

    return null;
};

const inferExtensionFromFile = (filePath: string): string => {
    try {
        const buffer = fs.readFileSync(filePath).subarray(0, 8192);

        if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
            return '.pdf';
        }
        if (buffer.length >= 8 &&
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
            buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
            return '.png';
        }
        if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return '.jpg';
        }
        if (buffer.length >= 8 &&
            buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 &&
            buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1) {
            return '.doc';
        }
        if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
            const snippet = buffer.toString('utf8');
            if (snippet.includes('word/') || snippet.includes('[Content_Types].xml')) {
                return '.docx';
            }
            return '.zip';
        }
    } catch {
        return '';
    }

    return '';
};

export const createCertificateRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.id;
        const file = req.file;

        const idProofUrl = getUploadedFileUrl(file as any);
        if (file && !idProofUrl) {
            return res.status(500).json({ message: 'File upload failed' });
        }

        const body = req.body;
        const usn = body.usn;
        const studentName = body.studentName;
        const branch = body.branch;
        const yearOfPassing = body.yearOfPassing;
        const phoneNumber = body.phoneNumber || undefined;
        const certificateType = body.certificateType;
        const copyType = body.copyType;
        const copies = 1;
        const reason = body.reason || undefined;
        const address = body.address || undefined;
        const amount = Number(body.amount) || 0;

        if (!usn || !studentName || !branch || !yearOfPassing || !phoneNumber || !certificateType || !copyType) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (!/^\d{10}$/.test(String(phoneNumber))) {
            return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }

        const parsedYear = Number(yearOfPassing);
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > currentYear + 1) {
            return res.status(400).json({ message: 'Enter a valid year of passing (2000 or later)' });
        }

        if ((copyType === 'HARD_COPY' || copyType === 'BOTH') && !String(address || '').trim()) {
            return res.status(400).json({ message: 'Postal address is required for hard copy delivery' });
        }

        if (!String(reason || '').trim()) {
            return res.status(400).json({ message: 'Reason for request is required' });
        }

        if (!file) {
            return res.status(400).json({ message: 'Government ID proof is required' });
        }

        const id = await generateRequestId();

        const certificateRequest = await prisma.certificateRequest.create({
            data: {
                id,
                userId,
                usn,
                studentName,
                branch,
                yearOfPassing,
                phoneNumber,
                certificateType,
                copyType,
                copies,
                reason,
                address,
                idProofUrl,
                amount,
                paymentStatus: 'PENDING',
                status: 'PENDING'
            }
        });

        if (!hasZwitchConfig()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        try {
            const order = await createZwitchOrder({
                amountPaise: Math.round(amount * 100),
                receipt: `cert-${id}-${Date.now()}`.slice(0, 40),
                description: `Certificate Request ${id}`,
                notes: {
                    requestType: 'CERTIFICATE',
                    requestId: id,
                    userId: String(userId)
                }
            });

            if (!order.id) {
                throw new Error('Payment provider did not return an order id');
            }

            await prisma.certificateRequest.update({
                where: { id: certificateRequest.id },
                data: { paymentOrderId: order.id }
            });

            res.status(201).json({
                request: certificateRequest,
                fileUrl: idProofUrl,
                zwitchOrder: {
                    id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'Global Academy of Technology',
                    description: `Certificate Request ${id}`,
                    checkoutUrl: order.checkoutUrl,
                    accessKey: order.accessKey,
                    fallbackAccessKey: order.fallbackAccessKey,
                    environment: order.environment
                }
            });
        } catch (paymentError) {
            await prisma.certificateRequest.delete({ where: { id: certificateRequest.id } }).catch(() => undefined);
            throw paymentError;
        }
    } catch (error: any) {
        console.error('Error creating certificate request:', error);
        const message = String(error?.message || 'Internal server error');
        const status = message.includes('Payment provider') || message.includes('Payment gateway') ? 503 : 500;
        res.status(status).json({ message, details: status === 500 ? error : undefined });
    }
};

export const verifyCertificatePayment = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        const id = String(req.params.id || '');
        const { zwitchOrderId } = req.body as {
            zwitchOrderId?: string;
        };

        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const request = await prisma.certificateRequest.findUnique({
            where: { id },
            select: { id: true, userId: true, paymentStatus: true, paymentOrderId: true, status: true }
        });

        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }

        if (request.paymentStatus === 'PAID') {
            return res.json({ message: 'Payment already verified', paymentStatus: 'PAID' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ message: 'Payment is not allowed after request is submitted to admin' });
        }

        const orderId = String(zwitchOrderId || request.paymentOrderId || '').trim();
        if (!orderId) {
            return res.status(400).json({ message: 'Payment order id is required for verification' });
        }

        if (request.paymentOrderId && request.paymentOrderId !== orderId) {
            return res.status(400).json({ message: 'Order ID mismatch for this request' });
        }

        const verification = await verifyZwitchOrderPaid(orderId, { maxAttempts: 10, intervalMs: 1500 });
        if (!verification.paid) {
            return res.status(400).json({ message: 'Payment is not completed yet' });
        }

        const updated = await prisma.certificateRequest.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentOrderId: orderId
            }
        });

        await sendCertificateConfirmationEmails(id);

        return res.json({ message: 'Payment verified successfully', request: updated });
    } catch (error) {
        console.error('Error verifying certificate payment:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const createCertificatePaymentOrder = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        const id = String(req.params.id || '');

        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const request = await prisma.certificateRequest.findUnique({
            where: { id },
            select: { id: true, userId: true, amount: true, paymentStatus: true, status: true }
        });

        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }

        if (request.paymentStatus === 'PAID') {
            return res.status(400).json({ message: 'Payment already completed for this request' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ message: 'Payment is not allowed after request is submitted to admin' });
        }

        if (!hasZwitchConfig()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        const amountPaise = Math.round(Number(request.amount || 0) * 100);
        if (amountPaise <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount for this request' });
        }

        const order = await createZwitchOrder({
            amountPaise,
            receipt: `cert-${id}-${Date.now()}`.slice(0, 40),
            description: `Certificate Request ${id}`,
            notes: {
                requestType: 'CERTIFICATE',
                requestId: id,
                userId
            }
        });

        if (!order.id) {
            return res.status(502).json({ message: 'Payment provider did not return an order id' });
        }

        await prisma.certificateRequest.update({
            where: { id },
            data: { paymentOrderId: order.id }
        });

        return res.json({
            zwitchOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Global Academy of Technology',
                description: `Certificate Request ${id}`,
                checkoutUrl: order.checkoutUrl,
                accessKey: order.accessKey,
                fallbackAccessKey: order.fallbackAccessKey,
                environment: order.environment
            }
        });
    } catch (error) {
        console.error('Error creating certificate retry payment order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getStudentRequests = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = (req as any).user.id;
        const requests = await prisma.certificateRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        console.error('Error fetching student requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const completeCertificateRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.params.id as string;
        const existing = await prisma.certificateRequest.findUnique({ where: { id }, select: { paymentStatus: true } });
        if (!existing) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }
        if (existing.paymentStatus !== 'PAID') {
            return res.status(400).json({ message: 'Only paid requests can be completed' });
        }
        const updated = await prisma.certificateRequest.update({
            where: { id },
            data: { status: 'COMPLETED' },
            include: { user: true }
        });

        if (updated.user?.email) {
            const safeStudentName = escapeHtml(updated.studentName);
            const safeCertificateType = escapeHtml(String(updated.certificateType || '').replace('_', ' '));
            const safeRequestId = escapeHtml(updated.id);
            const emailHtml = `
                <h2>Your Certificate Request is Complete</h2>
                <p>Hello ${safeStudentName},</p>
                <p>Your request for <strong>${safeCertificateType}</strong> (Request ID: ${safeRequestId}) has been marked as complete.</p>
                <p>You can now download your issued certificate from the portal if it is available.</p>
                <p>Thank you,</p>
                <p>Global Academy of Technology</p>
            `;

            void sendEmail(updated.user.email, 'Certificate Request Completed', emailHtml).catch((emailErr) => {
                console.error('Failed to send certificate completion email:', emailErr);
            });
        }

        res.json(updated);
    } catch (error) {
        console.error('Error completing request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const downloadStudentIssuedCertificate = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        const id = String(req.params.id || '');

        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const request = await prisma.certificateRequest.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true,
                copyType: true,
                issuedCertificateUrl: true
            }
        });

        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }

        if (request.copyType === 'HARD_COPY') {
            return res.status(400).json({ message: 'Soft copy is not available for this request' });
        }

        const served = await sendStoredFile(res, request.issuedCertificateUrl, `${request.id}-certificate`);
        if (!served) {
            return res.status(404).json({ message: 'Certificate file not found. Please contact admin.' });
        }
    } catch (error) {
        console.error('Error downloading issued certificate:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const downloadCertificateAcknowledgement = async (req: Request, res: Response): Promise<any> => {
        try {
                const userId = String((req as any).user?.id || '');
                const id = String(req.params.id || '');

                if (!userId || !id) {
                        return res.status(400).json({ message: 'Invalid request' });
                }

                const request = await prisma.certificateRequest.findUnique({
                        where: { id },
                        select: {
                                id: true,
                                userId: true,
                                studentName: true,
                                usn: true,
                                certificateType: true,
                                copyType: true,
                                amount: true,
                                paymentStatus: true,
                                status: true,
                                createdAt: true,
                                paymentOrderId: true
                        }
                });

                if (!request || request.userId !== userId) {
                        return res.status(404).json({ message: 'Certificate request not found' });
                }

                if (request.paymentStatus !== 'PAID') {
                        return res.status(400).json({ message: 'Acknowledgement is available after successful payment' });
                }

                const safeRequestId = escapeHtml(request.id);
                const safeName = escapeHtml(request.studentName);
                const safeUsn = escapeHtml(request.usn);
                const safeType = escapeHtml(formatEnumValue(request.certificateType));
                const safeCopy = escapeHtml(formatEnumValue(request.copyType));
                const safeStatus = escapeHtml(formatEnumValue(request.status));
                const safePaymentOrderId = escapeHtml(String(request.paymentOrderId || 'N/A'));

                const html = `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Certificate Request Acknowledgement - ${safeRequestId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
        .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px; max-width: 800px; }
        .title { font-size: 22px; margin: 0 0 8px; }
        .sub { color: #475569; margin: 0 0 16px; }
        .row { margin: 8px 0; }
        .label { display: inline-block; min-width: 220px; color: #334155; font-weight: 600; }
        .note { margin-top: 18px; padding: 12px; background: #f8fafc; border-radius: 8px; color: #334155; }
    </style>
</head>
<body>
    <div class="card">
        <h1 class="title">Certificate Request Acknowledgement</h1>
        <p class="sub">Global Academy of Technology</p>
        <div class="row"><span class="label">Request ID:</span>${safeRequestId}</div>
        <div class="row"><span class="label">Student Name:</span>${safeName}</div>
        <div class="row"><span class="label">USN:</span>${safeUsn}</div>
        <div class="row"><span class="label">Certificate Type:</span>${safeType}</div>
        <div class="row"><span class="label">Delivery Mode:</span>${safeCopy}</div>
        <div class="row"><span class="label">Amount Paid:</span>INR ${Number(request.amount || 0).toFixed(2)}</div>
        <div class="row"><span class="label">Payment Status:</span>Paid</div>
        <div class="row"><span class="label">Payment Order ID:</span>${safePaymentOrderId}</div>
        <div class="row"><span class="label">Current Status:</span>${safeStatus}</div>
        <div class="row"><span class="label">Submitted At:</span>${new Date(request.createdAt).toLocaleString('en-IN')}</div>
        <div class="row"><span class="label">Generated At:</span>${new Date().toLocaleString('en-IN')}</div>
        <div class="note">
            This acknowledgement confirms that your paid request has been received by the admin and is queued for processing.
            Keep this document as proof of successful application submission.
        </div>
    </div>
</body>
</html>`;

                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${request.id}-acknowledgement.html"`);
                return res.status(200).send(html);
        } catch (error) {
                console.error('Error downloading certificate acknowledgement:', error);
                return res.status(500).json({ message: 'Internal server error' });
        }
};

export const cancelStudentCertificateRequest = async (req: Request, res: Response): Promise<any> => {
    return res.status(403).json({
        message: 'Cancellation is disabled. Please contact the college office for any corrections or refund requests.'
    });
};

export const markStudentCertificatePaymentFailed = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        const id = String(req.params.id || '');

        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const request = await prisma.certificateRequest.findUnique({
            where: { id },
            select: { id: true, userId: true, paymentStatus: true, status: true }
        });

        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }

        if (request.paymentStatus === 'PAID') {
            return res.status(400).json({ message: 'Payment already completed for this request' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ message: 'Payment is not allowed after request is submitted to admin' });
        }

        const updated = await prisma.certificateRequest.update({
            where: { id },
            data: { paymentStatus: 'FAILED' }
        });

        return res.json({ message: 'Payment marked as failed', request: updated });
    } catch (error) {
        console.error('Error marking certificate payment as failed:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
