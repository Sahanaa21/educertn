import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { sendEmail } from '../utils/email';
import { escapeHtml } from '../utils/html';
import { getStoredFileExtension, sendStoredFile } from '../utils/fileStorage';
import {
    createZwitchOrder,
    hasZwitchConfig,
    verifyZwitchOrderPaid
} from '../config/zwitch';
import { generateVerificationRequestId } from '../utils/generateId';
import { AuthRequest } from '../middleware/authMiddleware';

const VERIFICATION_FEE = 5000;

const resolveStoredFilePath = (storedPath: string | null | undefined): string | null => {
    if (!storedPath) return null;

    const direct = path.isAbsolute(storedPath) ? storedPath : path.resolve(process.cwd(), storedPath);
    if (fs.existsSync(direct)) return direct;

    const normalized = storedPath.replace(/\\/g, '/');
    const uploadsIndex = normalized.lastIndexOf('/uploads/');
    if (uploadsIndex >= 0) {
        const relativeFromUploads = normalized.slice(uploadsIndex + 1); // "uploads/..."
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

        if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return '.pdf';
        if (buffer.length >= 8 &&
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
            buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) return '.png';
        if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return '.jpg';
        if (buffer.length >= 8 &&
            buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 &&
            buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1) return '.doc';
        if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
            const snippet = buffer.toString('utf8');
            if (snippet.includes('word/') || snippet.includes('[Content_Types].xml')) return '.docx';
            return '.zip';
        }
    } catch {
        return '';
    }

    return '';
};

const getAuthenticatedCompanyEmail = async (req: AuthRequest): Promise<string | null> => {
    const userId = req.user?.id as string | undefined;
    if (!userId) return null;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
    if (!user || user.role !== 'COMPANY') return null;
    return user.email;
};

export const createVerificationRequest = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const authEmail = await getAuthenticatedCompanyEmail(req);
        if (!authEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { companyName, contactPerson, phone, studentName, usn } = req.body as Record<string, string>;
        const templateFile = req.file;

        if (!companyName || !contactPerson || !studentName || !usn) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (phone && !/^\d{10}$/.test(String(phone))) {
            return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }

        if (!templateFile) {
            return res.status(400).json({ message: 'Verification template file is required' });
        }

        const templateUrl = String((templateFile as any).location || '');
        if (!templateUrl) {
            return res.status(500).json({ message: 'File upload failed' });
        }

        const requestId = await generateVerificationRequestId();

        const created = await prisma.verificationRequest.create({
            data: {
                requestId,
                companyName,
                companyEmail: authEmail,
                contactPerson,
                phone: phone || null,
                studentName,
                usn,
                uploadedTemplate: templateUrl,
                paymentStatus: 'PENDING',
                status: 'PENDING'
            }
        });

        if (!hasZwitchConfig()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        try {
            const order = await createZwitchOrder({
                amountPaise: VERIFICATION_FEE * 100,
                receipt: `ver-${requestId}-${Date.now()}`.slice(0, 40),
                description: `Verification Request ${requestId}`,
                notes: {
                    requestType: 'VERIFICATION',
                    requestId: created.id,
                    companyEmail: authEmail
                }
            });

            if (!order.id) {
                throw new Error('Payment provider did not return an order id');
            }

            await prisma.verificationRequest.update({
                where: { id: created.id },
                data: { paymentOrderId: order.id }
            });

            res.status(201).json({
                request: created,
                fileUrl: templateUrl,
                amount: VERIFICATION_FEE,
                zwitchOrder: {
                    id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'Global Academy of Technology',
                    description: `Verification Request ${requestId}`,
                    checkoutUrl: order.checkoutUrl,
                    accessKey: order.accessKey,
                    fallbackAccessKey: order.fallbackAccessKey,
                    environment: order.environment
                }
            });
        } catch (paymentError) {
            await prisma.verificationRequest.delete({ where: { id: created.id } }).catch(() => undefined);
            throw paymentError;
        }
    } catch (error) {
        console.error('Error creating verification request:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message.includes('Payment provider') || message.includes('Payment gateway') ? 503 : 500;
        res.status(status).json({ message: status === 503 ? 'Payment provider is temporarily unavailable. Please try again shortly.' : 'Internal server error' });
    }
};

export const verifyVerificationPayment = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const companyEmail = await getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const id = String(req.params.id || '');
        const { zwitchOrderId } = req.body as {
            zwitchOrderId?: string;
        };

        if (!id) {
            return res.status(400).json({ message: 'Payment verification details are required' });
        }

        const request = await prisma.verificationRequest.findUnique({
            where: { id },
            select: { id: true, requestId: true, companyEmail: true, paymentStatus: true, status: true, paymentOrderId: true }
        });

        if (!request || request.companyEmail.toLowerCase() !== companyEmail.toLowerCase()) {
            return res.status(404).json({ message: 'Request not found' });
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

        const updated = await prisma.verificationRequest.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentOrderId: orderId
            }
        });

        return res.json({ message: 'Payment verified successfully', request: updated });
    } catch (error) {
        console.error('Error verifying verification payment:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
export const createVerificationPaymentOrder = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const companyEmail = await getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const id = String(req.params.id || '');
        if (!id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const request = await prisma.verificationRequest.findUnique({
            where: { id },
            select: { id: true, requestId: true, companyEmail: true, paymentStatus: true, status: true }
        });

        if (!request || request.companyEmail.toLowerCase() !== companyEmail.toLowerCase()) {
            return res.status(404).json({ message: 'Request not found' });
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

        const order = await createZwitchOrder({
            amountPaise: VERIFICATION_FEE * 100,
            receipt: `ver-${request.requestId}-${Date.now()}`.slice(0, 40),
            description: `Verification Request ${request.requestId}`,
            notes: {
                requestType: 'VERIFICATION',
                requestId: request.id,
                companyEmail
            }
        });

        if (!order.id) {
            return res.status(502).json({ message: 'Payment provider did not return an order id' });
        }

        await prisma.verificationRequest.update({
            where: { id: request.id },
            data: { paymentOrderId: order.id }
        });

        return res.json({
            zwitchOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Global Academy of Technology',
                description: `Verification Request ${request.requestId}`,
                checkoutUrl: order.checkoutUrl,
                accessKey: order.accessKey,
                fallbackAccessKey: order.fallbackAccessKey,
                environment: order.environment
            }
        });
    } catch (error) {
        console.error('Error creating verification retry payment order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getCompanyVerifications = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const companyEmail = await getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const requests = await prisma.verificationRequest.findMany({
            where: { companyEmail },
            orderBy: { createdAt: 'desc' },
        });

        res.json(requests);
    } catch (error) {
        console.error('Error fetching company verifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const downloadCompanyCompletedFile = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const companyEmail = await getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const id = String(req.params.id);

        const request = await prisma.verificationRequest.findUnique({
            where: { id },
            select: { requestId: true, companyEmail: true, completedFile: true, status: true }
        });

        if (!request || request.companyEmail.toLowerCase() !== companyEmail.toLowerCase()) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.status !== 'COMPLETED' || !request.completedFile) {
            return res.status(400).json({ message: 'Completed response file not available yet' });
        }

        const served = await sendStoredFile(res, request.completedFile, `${request.requestId}-completed-file`);
        if (!served) {
            return res.status(404).json({ message: 'Completed response file not available yet' });
        }
    } catch (error) {
        console.error('Error downloading completed verification file:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const completeVerificationRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.params.id as string;
        const updated = await prisma.verificationRequest.update({
            where: { id },
            data: { status: 'COMPLETED' }
        });

        if (updated.companyEmail) {
            const safeContactPerson = escapeHtml(updated.contactPerson || 'there');
            const safeRequestId = escapeHtml(updated.requestId);
            const emailHtml = `
                <h2>Verification Request Completed</h2>
                <p>Hello ${safeContactPerson},</p>
                <p>Your verification request <strong>${safeRequestId}</strong> has been marked as complete.</p>
                <p>You can now download the completed response from the portal if it is available.</p>
                <p>Thank you,</p>
                <p>Global Academy of Technology</p>
            `;

            const attachments = updated.completedFile
                ? [{
                    filename: `${updated.requestId}-completed-file${getStoredFileExtension(updated.completedFile) || path.extname(updated.completedFile || '') || ''}`,
                    path: updated.completedFile
                }]
                : undefined;

            void sendEmail(
                updated.companyEmail,
                'Verification Completed – Global Academy of Technology',
                emailHtml,
                attachments
            ).catch((emailErr) => {
                console.error('Failed to send verification completion email:', emailErr);
            });
        }

        res.json(updated);
    } catch (error) {
        console.error('Error completing verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const cancelCompanyVerificationRequest = async (req: AuthRequest, res: Response): Promise<any> => {
    return res.status(403).json({
        message: 'Cancellation is disabled. Please contact the college office for any corrections or refund requests.'
    });
};
