import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../config/prisma';
import {
    createZwitchOrder,
    hasZwitchConfig,
    verifyZwitchOrderPaid,
} from '../config/zwitch';

const PHOTOCOPY_FEE = 500;
const REEVALUATION_FEE = 3000;
const DEFAULT_ADMIN_ALLOWLIST = String(process.env.ADMIN_BOOTSTRAP_EMAILS || '').trim();

const parseAdminAllowlist = (raw: string | null | undefined) => {
    return String(raw || '')
        .split(/[\n,;]/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
};

const getSettings = async () => {
    return await (prisma as any).portalSettings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            supportEmail: 'support@gat.ac.in',
            frontendUrl: process.env.FRONTEND_URL || 'https://gat-verification-portal.vercel.app',
            maintenanceMode: false,
            allowCompanySignup: true,
            smtpFromName: 'Global Academy of Technology',
            adminAllowedEmails: DEFAULT_ADMIN_ALLOWLIST,
            academicServicesEnabled: false,
            academicServicesStartAt: null,
            academicServicesEndAt: null,
        }
    });
};

const getAcademicWindowState = async () => {
    const settings = await getSettings();
    const now = new Date();
    const start = settings.academicServicesStartAt ? new Date(settings.academicServicesStartAt) : null;
    const end = settings.academicServicesEndAt ? new Date(settings.academicServicesEndAt) : null;

    const activeByTime = (!start || now >= start) && (!end || now <= end);
    const active = Boolean(settings.academicServicesEnabled && activeByTime);

    return {
        settings,
        active,
        now,
        start,
        end,
    };
};

const sanitizeCourseNames = (raw: unknown): string[] => {
    if (!raw) return [];

    let list: unknown[] = [];

    if (Array.isArray(raw)) {
        list = raw;
    } else if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                list = parsed;
            }
        } catch {
            list = raw.split(',');
        }
    }

    return list
        .map((item) => String(item || '').trim())
        .filter(Boolean);
};

const getRequestAmount = (serviceType: string, courseCount: number) => {
    const unit = serviceType === 'PHOTOCOPY' ? PHOTOCOPY_FEE : REEVALUATION_FEE;
    return unit * courseCount;
};

const generateServiceRequestId = (serviceType: string) => {
    const prefix = serviceType === 'PHOTOCOPY' ? 'PC' : 'RV';
    const stamp = Date.now().toString().slice(-8);
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `${prefix}${stamp}${rand}`;
};

export const getAcademicServicesAvailabilityPublic = async (_req: Request, res: Response): Promise<any> => {
    try {
        const { active, start, end, settings } = await getAcademicWindowState();
        return res.json({
            active,
            enabled: Boolean(settings.academicServicesEnabled),
            startAt: start,
            endAt: end,
        });
    } catch (error) {
        console.error('Failed to get academic service availability:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAcademicServicesAvailabilityStudent = async (_req: Request, res: Response): Promise<any> => {
    return getAcademicServicesAvailabilityPublic(_req, res);
};

export const createAcademicServiceRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (!user || user.role !== 'STUDENT') {
            return res.status(403).json({ message: 'Only currently studying students can apply for this service' });
        }

        const { active, start, end } = await getAcademicWindowState();
        if (!active) {
            return res.status(400).json({
                message: 'This service is currently closed',
                startAt: start,
                endAt: end,
            });
        }

        const serviceType = String(req.body?.serviceType || '').toUpperCase();
        const semester = String(req.body?.semester || '').trim();
        const courseCount = Number(req.body?.courseCount || 0);
        const courseNames = sanitizeCourseNames(req.body?.courseNames);

        if (!['PHOTOCOPY', 'REEVALUATION'].includes(serviceType)) {
            return res.status(400).json({ message: 'Invalid service type' });
        }

        if (!semester) {
            return res.status(400).json({ message: 'Semester is required' });
        }

        if (!Number.isInteger(courseCount) || courseCount < 1 || courseCount > 7) {
            return res.status(400).json({ message: 'Number of courses must be between 1 and 7' });
        }

        if (courseNames.length !== courseCount) {
            return res.status(400).json({ message: 'Please provide course names for all selected courses' });
        }

        const amount = getRequestAmount(serviceType, courseCount);
        const requestId = generateServiceRequestId(serviceType);

        const created = await (prisma as any).academicServiceRequest.create({
            data: {
                requestId,
                userId,
                serviceType,
                semester,
                courseCount,
                courseNames,
                amount,
                paymentStatus: 'PENDING',
                status: 'PENDING',
            }
        });

        if (!hasZwitchConfig()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        const order = await createZwitchOrder({
            amountPaise: Math.round(amount * 100),
            receipt: `svc-${requestId}-${Date.now()}`.slice(0, 40),
            description: `${serviceType} Request ${requestId}`,
            notes: {
                requestType: 'ACADEMIC_SERVICE',
                requestId: created.id,
                serviceType,
                userId,
            }
        });

        if (!order.id) {
            return res.status(502).json({ message: 'Payment provider did not return an order id' });
        }

        const updated = await (prisma as any).academicServiceRequest.update({
            where: { id: created.id },
            data: { paymentOrderId: order.id }
        });

        return res.status(201).json({
            request: updated,
            zwitchOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Global Academy of Technology',
                description: `${serviceType} Request ${requestId}`,
                checkoutUrl: order.checkoutUrl,
                accessKey: order.accessKey,
                fallbackAccessKey: order.fallbackAccessKey,
                environment: order.environment,
            }
        });
    } catch (error) {
        console.error('Failed to create academic service request:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const verifyAcademicServicePayment = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        const id = String(req.params.id || '');
        const { zwitchOrderId } = req.body as {
            zwitchOrderId?: string;
        };

        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request payload' });
        }

        const request = await (prisma as any).academicServiceRequest.findUnique({
            where: { id },
            select: { id: true, userId: true, requestId: true, paymentStatus: true, paymentOrderId: true }
        });

        if (!request || request.userId !== userId) {
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
            return res.status(400).json({ message: 'Order mismatch for this request' });
        }

        const verification = await verifyZwitchOrderPaid(orderId, { maxAttempts: 10, intervalMs: 1500 });
        if (!verification.paid) {
            return res.status(400).json({ message: 'Payment is not completed yet' });
        }

        const updated = await (prisma as any).academicServiceRequest.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentOrderId: orderId,
            }
        });

        return res.json({ message: 'Payment verified successfully', request: updated });
    } catch (error) {
        console.error('Failed to verify academic service payment:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const createAcademicServicePaymentOrder = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        const id = String(req.params.id || '');

        if (!userId || !id) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const request = await (prisma as any).academicServiceRequest.findUnique({
            where: { id },
            select: { id: true, requestId: true, userId: true, amount: true, paymentStatus: true, status: true, serviceType: true }
        });

        if (!request || request.userId !== userId) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.paymentStatus === 'PAID') {
            return res.status(400).json({ message: 'Payment already completed for this request' });
        }

        if (!hasZwitchConfig()) {
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        const amountPaise = Math.round(Number(request.amount || 0) * 100);
        if (amountPaise <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount' });
        }

        const order = await createZwitchOrder({
            amountPaise,
            receipt: `svc-${request.requestId}-${Date.now()}`.slice(0, 40),
            description: `${request.serviceType} Request ${request.requestId}`,
            notes: {
                requestType: 'ACADEMIC_SERVICE',
                requestId: request.id,
                serviceType: request.serviceType,
                userId,
            }
        });

        if (!order.id) {
            return res.status(502).json({ message: 'Payment provider did not return an order id' });
        }

        await (prisma as any).academicServiceRequest.update({
            where: { id: request.id },
            data: { paymentOrderId: order.id }
        });

        return res.json({
            zwitchOrder: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Global Academy of Technology',
                description: `${request.serviceType} Request ${request.requestId}`,
                checkoutUrl: order.checkoutUrl,
                accessKey: order.accessKey,
                fallbackAccessKey: order.fallbackAccessKey,
                environment: order.environment
            }
        });
    } catch (error) {
        console.error('Failed to create payment order for academic service:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getStudentAcademicServiceRequests = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const requests = await (prisma as any).academicServiceRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        return res.json(requests);
    } catch (error) {
        console.error('Failed to fetch student academic service requests:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllAcademicServiceRequests = async (_req: Request, res: Response): Promise<any> => {
    try {
        const rawServiceType = String((_req.query?.serviceType as string) || '').toUpperCase();
        const serviceType = ['PHOTOCOPY', 'REEVALUATION'].includes(rawServiceType) ? rawServiceType : null;

        const requests = await (prisma as any).academicServiceRequest.findMany({
            where: serviceType ? { serviceType } : undefined,
            include: {
                user: { select: { email: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json(requests);
    } catch (error) {
        console.error('Failed to fetch admin academic service requests:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateAcademicServiceRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id || '');
        const { status, adminRemarks, resultSummary, action } = req.body as {
            status?: 'PENDING' | 'UNDER_REVIEW' | 'RESULT_PUBLISHED' | 'REJECTED';
            adminRemarks?: string;
            resultSummary?: string;
            action?: string;
        };

        const existing = await (prisma as any).academicServiceRequest.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (action === 'MARK_REFUND_COMPLETED') {
            if (existing.paymentStatus !== 'REFUND_INITIATED') {
                return res.status(400).json({ message: 'Refund can be completed only after refund is initiated' });
            }
            const updated = await (prisma as any).academicServiceRequest.update({
                where: { id },
                data: { paymentStatus: 'REFUND_COMPLETED' }
            });
            return res.json(updated);
        }

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const nextRemarks = typeof adminRemarks === 'string' ? adminRemarks.trim() : String(existing.adminRemarks || '').trim();
        const nextResultSummary = typeof resultSummary === 'string' ? resultSummary.trim() : String(existing.resultSummary || '').trim();

        if (status === 'REJECTED' && !nextRemarks) {
            return res.status(400).json({ message: 'Admin remarks are required when rejecting a request' });
        }

        if (status === 'RESULT_PUBLISHED' && existing.paymentStatus !== 'PAID') {
            return res.status(400).json({ message: 'Result can be published only for paid requests' });
        }

        if (status === 'RESULT_PUBLISHED' && existing.serviceType === 'REEVALUATION' && !nextResultSummary) {
            return res.status(400).json({ message: 'Result summary is required when publishing results' });
        }

        if (status === 'RESULT_PUBLISHED' && existing.serviceType === 'PHOTOCOPY') {
            const attachments = Array.isArray(existing.attachmentUrls) ? existing.attachmentUrls : [];
            if (attachments.length < 2) {
                return res.status(400).json({
                    message: 'Upload both answer sheet copy and course evaluation scheme before marking photocopy request as completed'
                });
            }
        }

        const data: any = {
            status,
            adminRemarks: nextRemarks,
            resultSummary: nextResultSummary,
        };

        if (status === 'REJECTED' && existing.paymentStatus === 'PAID') {
            data.paymentStatus = 'REFUND_INITIATED';
        }

        const updated = await (prisma as any).academicServiceRequest.update({
            where: { id },
            data,
        });

        return res.json(updated);
    } catch (error) {
        console.error('Failed to update academic service request:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const uploadAcademicServiceAttachments = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id || '');
        const files = (req.files || []) as Express.Multer.File[];
        const validFiles = files.filter((file) => Number(file.size || 0) > 0);

        if (!id || validFiles.length === 0) {
            return res.status(400).json({ message: 'Files are required' });
        }

        const existing = await (prisma as any).academicServiceRequest.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (existing.status === 'RESULT_PUBLISHED' || existing.status === 'REJECTED') {
            return res.status(400).json({ message: 'Attachments cannot be updated for completed or rejected requests' });
        }

        const prev = Array.isArray(existing.attachmentUrls) ? existing.attachmentUrls : [];
        const newUrls = validFiles.map((file) => `/uploads/${path.basename(file.path)}`);
        const merged = [...prev, ...newUrls];

        const updated = await (prisma as any).academicServiceRequest.update({
            where: { id },
            data: {
                attachmentUrls: merged,
                status: existing.status === 'PENDING' ? 'UNDER_REVIEW' : existing.status,
            }
        });

        return res.json(updated);
    } catch (error) {
        console.error('Failed to upload academic service attachments:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAcademicServiceSettingsAdmin = async (_req: Request, res: Response): Promise<any> => {
    try {
        const settings = await getSettings();
        return res.json({
            academicServicesEnabled: Boolean(settings.academicServicesEnabled),
            academicServicesStartAt: settings.academicServicesStartAt,
            academicServicesEndAt: settings.academicServicesEndAt,
            adminAllowedEmails: String(settings.adminAllowedEmails || ''),
        });
    } catch (error) {
        console.error('Failed to fetch academic service settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateAcademicServiceSettingsAdmin = async (req: Request, res: Response): Promise<any> => {
    try {
        const {
            academicServicesEnabled,
            academicServicesStartAt,
            academicServicesEndAt,
            adminAllowedEmails,
        } = req.body as {
            academicServicesEnabled?: boolean;
            academicServicesStartAt?: string | null;
            academicServicesEndAt?: string | null;
            adminAllowedEmails?: string;
        };

        const allowlistEmails = parseAdminAllowlist(adminAllowedEmails);
        if (allowlistEmails.length === 0) {
            return res.status(400).json({ message: 'Provide at least one valid admin email' });
        }

        const start = academicServicesStartAt ? new Date(academicServicesStartAt) : null;
        const end = academicServicesEndAt ? new Date(academicServicesEndAt) : null;

        if (start && Number.isNaN(start.getTime())) {
            return res.status(400).json({ message: 'Invalid start date' });
        }

        if (end && Number.isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid end date' });
        }

        if (start && end && start > end) {
            return res.status(400).json({ message: 'Start date must be before end date' });
        }

        const updated = await (prisma as any).portalSettings.upsert({
            where: { id: 1 },
            update: {
                academicServicesEnabled: Boolean(academicServicesEnabled),
                academicServicesStartAt: start,
                academicServicesEndAt: end,
                adminAllowedEmails: allowlistEmails.join(', '),
            },
            create: {
                id: 1,
                supportEmail: 'support@gat.ac.in',
                frontendUrl: process.env.FRONTEND_URL || 'https://gat-verification-portal.vercel.app',
                maintenanceMode: false,
                allowCompanySignup: true,
                smtpFromName: 'Global Academy of Technology',
                adminAllowedEmails: allowlistEmails.join(', '),
                academicServicesEnabled: Boolean(academicServicesEnabled),
                academicServicesStartAt: start,
                academicServicesEndAt: end,
            }
        });

        return res.json(updated);
    } catch (error) {
        console.error('Failed to update academic service settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
