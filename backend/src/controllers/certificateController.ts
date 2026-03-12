import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generateRequestId } from '../utils/generateId';

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
        if (!Number.isInteger(parsedYear) || parsedYear < 1990 || parsedYear > currentYear + 1) {
            return res.status(400).json({ message: 'Enter a valid year of passing' });
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

        // Simulate immediate payment success for this flow
        const updatedRequest = await prisma.certificateRequest.update({
            where: { id: certificateRequest.id },
            data: { paymentStatus: 'PAID' }
        });

        res.status(201).json(updatedRequest);
    } catch (error: any) {
        console.error('Error creating certificate request:', error);
        res.status(500).json({ message: error.message || 'Internal server error', details: error });
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
