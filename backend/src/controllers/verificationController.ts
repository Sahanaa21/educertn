import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generateRequestId } from '../utils/generateId';

export const createVerificationRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const { companyName, companyEmail, contactPerson, phoneNumber, studentName, usn, branch, yearOfPassing, verificationType, amount } = req.body;

        const id = await generateRequestId();

        const verificationRequest = await prisma.verificationRequest.create({
            data: {
                id,
                companyName,
                companyEmail,
                contactPerson,
                phoneNumber,
                studentName,
                usn,
                branch,
                yearOfPassing,
                verificationType,
                amount: Number(amount),
                paymentStatus: 'PENDING',
                status: 'PENDING'
            }
        });

        // Simulate immediate payment success for this flow
        const updatedRequest = await prisma.verificationRequest.update({
            where: { id: verificationRequest.id },
            data: { paymentStatus: 'PAID' }
        });

        res.status(201).json(updatedRequest);
    } catch (error) {
        console.error('Error creating verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getCompanyVerifications = async (req: Request, res: Response): Promise<any> => {
    try {
        const companyEmail = (req as any).user?.email;
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
