import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
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
                paymentStatus: 'PAID',
                status: 'PENDING'
            }
        });

        res.status(201).json({ ...created, amount: VERIFICATION_FEE });
    } catch (error) {
        console.error('Error creating verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
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

        const extension = path.extname(resolvedCompletedFilePath || '') || '';
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
