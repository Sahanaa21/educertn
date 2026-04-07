import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { sendEmail } from '../utils/email';
import { escapeHtml } from '../utils/html';
import {
    createZwitchOrder,
    hasZwitchConfig,
    verifyZwitchOrderPaid
} from '../config/zwitch';
import { generateRequestId } from '../utils/generateId';

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

        // In a real app you would upload this to Cloudinary. For now, we mock the URL.
        const idProofUrl = file ? `/uploads/${file.filename}` : undefined;

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
            select: { id: true, userId: true, paymentStatus: true, paymentOrderId: true }
        });

        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }

        if (request.paymentStatus === 'PAID') {
            return res.json({ message: 'Payment already verified', paymentStatus: 'PAID' });
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

        if (request.status === 'REJECTED') {
            return res.status(400).json({ message: 'Payment is not allowed for rejected requests' });
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

        const resolvedFilePath = resolveStoredFilePath(request.issuedCertificateUrl);
        if (!resolvedFilePath) {
            return res.status(404).json({ message: 'Certificate file not found. Please contact admin.' });
        }

        const extension = path.extname(resolvedFilePath || '') || inferExtensionFromFile(resolvedFilePath) || '';
        return res.download(resolvedFilePath, `${request.id}-certificate${extension}`);
    } catch (error) {
        console.error('Error downloading issued certificate:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const cancelStudentCertificateRequest = async (req: Request, res: Response): Promise<any> => {
    return res.status(403).json({
        message: 'Cancellation is disabled. Please contact the college office for any corrections or refund requests.'
    });
};
