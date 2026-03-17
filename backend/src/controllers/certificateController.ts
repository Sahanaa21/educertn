import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { createRazorpayOrder, fetchRazorpayOrder, getRazorpayKeyId, hasRazorpayConfig, verifyRazorpaySignature } from '../config/razorpay';
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
        const copies = Number(body.copies) || 1;
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

        if (!hasRazorpayConfig()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        const order = await createRazorpayOrder({
            amountPaise: Math.round(amount * 100),
            receipt: `cert-${id}-${Date.now()}`.slice(0, 40),
            notes: {
                requestType: 'CERTIFICATE',
                requestId: id,
                userId: String(userId)
            }
        });

        await prisma.certificateRequest.update({
            where: { id: certificateRequest.id },
            data: { stripeSessionId: order.id }
        });

        res.status(201).json({
            request: certificateRequest,
            razorpayOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: getRazorpayKeyId(),
                name: 'Global Academy of Technology',
                description: `Certificate Request ${id}`
            }
        });
    } catch (error: any) {
        console.error('Error creating certificate request:', error);
        res.status(500).json({ message: error.message || 'Internal server error', details: error });
    }
};

export const verifyCertificatePayment = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        const id = String(req.params.id || '');
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body as {
            razorpayOrderId?: string;
            razorpayPaymentId?: string;
            razorpaySignature?: string;
        };

        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ message: 'Payment verification details are required' });
        }

        const request = await prisma.certificateRequest.findUnique({
            where: { id },
            select: { id: true, userId: true, paymentStatus: true, stripeSessionId: true }
        });

        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }

        if (request.paymentStatus === 'PAID') {
            return res.json({ message: 'Payment already verified', paymentStatus: 'PAID' });
        }

        if (request.stripeSessionId && request.stripeSessionId !== razorpayOrderId) {
            return res.status(400).json({ message: 'Order ID mismatch for this request' });
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
        if (orderRequestId !== id && !orderReceipt.startsWith(`cert-${id}`)) {
            return res.status(400).json({ message: 'Payment order does not match this request' });
        }

        const updated = await prisma.certificateRequest.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                stripeSessionId: razorpayOrderId
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
            select: { id: true, userId: true, amount: true, paymentStatus: true }
        });

        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Certificate request not found' });
        }

        if (request.paymentStatus === 'PAID') {
            return res.status(400).json({ message: 'Payment already completed for this request' });
        }

        if (!hasRazorpayConfig()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        const amountPaise = Math.round(Number(request.amount || 0) * 100);
        if (amountPaise <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount for this request' });
        }

        const order = await createRazorpayOrder({
            amountPaise,
            receipt: `cert-${id}-${Date.now()}`.slice(0, 40),
            notes: {
                requestType: 'CERTIFICATE',
                requestId: id,
                userId
            }
        });

        await prisma.certificateRequest.update({
            where: { id },
            data: { stripeSessionId: order.id }
        });

        return res.json({
            razorpayOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: getRazorpayKeyId(),
                name: 'Global Academy of Technology',
                description: `Certificate Request ${id}`
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

        // TODO: Send completion email here
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
