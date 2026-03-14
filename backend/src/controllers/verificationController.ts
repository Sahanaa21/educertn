import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { createRazorpayOrder, fetchRazorpayOrder, getRazorpayKeyId, hasRazorpayConfig, verifyRazorpaySignature } from '../config/razorpay';
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
                uploadedTemplate: templateFile.path,
                paymentStatus: 'PENDING',
                status: 'PENDING'
            }
        });

        if (!hasRazorpayConfig()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        const order = await createRazorpayOrder({
            amountPaise: VERIFICATION_FEE * 100,
            receipt: `ver-${requestId}`.slice(0, 40),
            notes: {
                requestType: 'VERIFICATION',
                requestId: created.id,
                companyEmail: authEmail
            }
        });

        res.status(201).json({
            request: created,
            amount: VERIFICATION_FEE,
            razorpayOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: getRazorpayKeyId(),
                name: 'Global Academy of Technology',
                description: `Verification Request ${requestId}`
            }
        });
    } catch (error) {
        console.error('Error creating verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const verifyVerificationPayment = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const companyEmail = await getAuthenticatedCompanyEmail(req);
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const id = String(req.params.id || '');
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body as {
            razorpayOrderId?: string;
            razorpayPaymentId?: string;
            razorpaySignature?: string;
        };

        if (!id || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ message: 'Payment verification details are required' });
        }

        const request = await prisma.verificationRequest.findUnique({
            where: { id },
            select: { id: true, requestId: true, companyEmail: true, paymentStatus: true }
        });

        if (!request || request.companyEmail.toLowerCase() !== companyEmail.toLowerCase()) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.paymentStatus === 'PAID') {
            return res.json({ message: 'Payment already verified', paymentStatus: 'PAID' });
        }

        const valid = verifyRazorpaySignature({
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature
        });

        if (!valid) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        const order = await fetchRazorpayOrder(razorpayOrderId);
        const orderRequestId = String((order.notes as any)?.requestId || '');
        const orderReceipt = String(order.receipt || '');
        if (orderRequestId !== id && orderReceipt !== `ver-${request.requestId}`.slice(0, 40)) {
            return res.status(400).json({ message: 'Payment order does not match this request' });
        }

        const updated = await prisma.verificationRequest.update({
            where: { id },
            data: { paymentStatus: 'PAID' }
        });

        return res.json({ message: 'Payment verified successfully', request: updated });
    } catch (error) {
        console.error('Error verifying verification payment:', error);
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

        const resolvedCompletedFilePath = resolveStoredFilePath(request.completedFile);

        if (request.status !== 'COMPLETED' || !resolvedCompletedFilePath) {
            return res.status(400).json({ message: 'Completed response file not available yet' });
        }

        const extension = path.extname(resolvedCompletedFilePath || '') || inferExtensionFromFile(resolvedCompletedFilePath) || '';
        return res.download(resolvedCompletedFilePath, `${request.requestId}-completed-file${extension}`);
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

        // TODO: Send completion email here
        res.json(updated);
    } catch (error) {
        console.error('Error completing verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
