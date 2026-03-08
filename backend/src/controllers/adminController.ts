import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendEmail } from '../utils/email';

export const getDashboardStats = async (req: Request, res: Response): Promise<any> => {
    try {
        const totalCerts = await prisma.certificateRequest.count();
        const pendingCerts = await prisma.certificateRequest.count({ where: { status: 'PENDING' } });
        const processingCerts = await prisma.certificateRequest.count({ where: { status: 'PROCESSING' } });

        const totalVerifications = await prisma.verificationRequest.count();
        const pendingVerifs = await prisma.verificationRequest.count({ where: { status: 'PENDING' } });

        const certsRevenue = await prisma.certificateRequest.aggregate({
            _sum: { amount: true },
            where: { paymentStatus: 'PAID' }
        });

        const verifsRevenue = await prisma.verificationRequest.aggregate({
            _sum: { amount: true },
            where: { paymentStatus: 'PAID' }
        });

        const totalRevenue = (certsRevenue._sum.amount || 0) + (verifsRevenue._sum.amount || 0);

        const recentCertificates = await prisma.certificateRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        const recentVerifications = await prisma.verificationRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        res.json({
            stats: {
                totalCerts,
                pendingActions: pendingCerts + processingCerts + pendingVerifs,
                totalVerifications,
                totalRevenue
            },
            recentCertificates,
            recentVerifications
        });
    } catch (error) {
        console.error('Error fetching admin dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllCertificates = async (req: Request, res: Response): Promise<any> => {
    try {
        const certificates = await prisma.certificateRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { email: true } } }
        });
        res.json(certificates);
    } catch (error) {
        console.error('Error fetching all certificates:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateCertificateStatus = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);
        const { status, action } = req.body;

        const request = await prisma.certificateRequest.findUnique({ where: { id }, include: { user: true } }) as any;
        if (!request) return res.status(404).json({ message: 'Not found' });

        require('fs').appendFileSync('dump.txt', JSON.stringify({
            stage: 'start',
            id,
            reqBody: req.body,
            reqFile: req.file,
            requestCopyType: request.copyType,
            requestEmailed: request.softCopyEmailed,
            requestPosted: request.physicalCopyPosted
        }) + '\n');

        let updateData: any = {};
        if (status) updateData.status = status;

        let finalStatus = status || request.status;
        const copyType = request.copyType;
        let pPosted = request.physicalCopyPosted;
        let sEmailed = request.softCopyEmailed;

        if (action === 'MARK_POSTED') {
            updateData.physicalCopyPosted = true;
            pPosted = true;
        } else if (action === 'UPLOAD_SOFT_COPY' || req.file) {
            updateData.softCopyEmailed = true;
            sEmailed = true;
        }

        // Logic to automate status if not manually overridden
        if (['PENDING', 'PROCESSING'].includes(finalStatus)) {
            const softMet = copyType === 'HARD_COPY' || sEmailed;
            const hardMet = copyType === 'SOFT_COPY' || pPosted;

            if (softMet && hardMet) {
                finalStatus = 'COMPLETED';
            } else if (sEmailed || pPosted) {
                finalStatus = 'PROCESSING';
            }
            updateData.status = finalStatus;
        }

        const updated = await prisma.certificateRequest.update({
            where: { id },
            data: updateData,
            include: { user: true }
        }) as any;

        // Trigger granular emails
        if (updated.user?.email) {
            if ((action === 'UPLOAD_SOFT_COPY' || req.file) && !request.softCopyEmailed) {
                const emailHtml = `
                    <h2>Your Certificate Soft Copy is Ready</h2>
                    <p>Hello ${updated.studentName},</p>
                    <p>Your request for a <strong>${updated.certificateType.replace('_', ' ')}</strong> (Request ID: ${updated.id}) has been processed.</p>
                    <p>Please find your soft copy document attached to this email.</p>
                    ${updated.copyType === 'BOTH' && !updated.physicalCopyPosted ? '<p>Your physical hard copies are still being processed and will be dispatched shortly.</p>' : ''}
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;

                let attachments = [];
                if (req.file) {
                    attachments.push({ filename: req.file.originalname, path: req.file.path });
                }
                await sendEmail(updated.user.email, 'Certificate Soft Copy Delivery', emailHtml, attachments);
            }

            if (action === 'MARK_POSTED' && !request.physicalCopyPosted) {
                const emailHtml = `
                    <h2>Your Certificate Hard Copy Dispatched</h2>
                    <p>Hello ${updated.studentName},</p>
                    <p>Your physical hard copies for <strong>${updated.certificateType.replace('_', ' ')}</strong> (Request ID: ${updated.id}) have been dispatched to your provided address.</p>
                    ${updated.copyType === 'BOTH' && !updated.softCopyEmailed ? '<p>Your soft copy will be emailed to you shortly.</p>' : ''}
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;
                await sendEmail(updated.user.email, 'Certificate Hard Copy Dispatched', emailHtml);
            }

            // Generic completion fallback if status manually set to COMPLETED without actions
            if (status === 'COMPLETED' && !action && request.status !== 'COMPLETED') {
                const emailHtml = `
                    <h2>Your Certificate Request is Complete</h2>
                    <p>Hello ${updated.studentName},</p>
                    <p>Your request for a <strong>${updated.certificateType.replace('_', ' ')}</strong> (Request ID: ${updated.id}) has been manually marked as complete.</p>
                    <p>Thank you,</p>
                    <p>Global Academy of Technology</p>
                `;
                await sendEmail(updated.user.email, 'Certificate Request Completed', emailHtml);
            }
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating certificate status:', error);
        res.status(500).json({ message: 'Internal server error', error: String(error), stack: (error as any).stack });
    }
};

export const getAllVerifications = async (req: Request, res: Response): Promise<any> => {
    try {
        const verifications = await prisma.verificationRequest.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(verifications);
    } catch (error) {
        console.error('Error fetching all verifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateVerificationStatus = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);
        const { status } = req.body;

        const updated = await prisma.verificationRequest.update({
            where: { id },
            data: { status }
        }) as any;

        if (status === 'COMPLETED' && updated.companyEmail) {
            const emailHtml = `
                <h2>Verification Request Complete</h2>
                <p>Hello ${updated.contactPerson},</p>
                <p>Your verification request for <strong>${updated.studentName}</strong> (Request ID: ${updated.id}) has been successfully completed.</p>
                <p>Thank you,</p>
                <p>Global Academy of Technology</p>
            `;
            await sendEmail(updated.companyEmail, 'Verification Request Completed', emailHtml);
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating verification status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
