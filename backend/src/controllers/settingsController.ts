import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

const defaultFrontendUrl = process.env.FRONTEND_URL?.trim()
    || process.env.FRONTEND_URLS?.split(',').map((url) => url.trim()).find(Boolean)
    || 'https://gat-verification-portal.vercel.app';

const DEFAULT_SETTINGS = {
    id: 1,
    supportEmail: 'support@gat.ac.in',
    frontendUrl: defaultFrontendUrl,
    maintenanceMode: false,
    allowCompanySignup: true,
    smtpFromName: 'Global Academy of Technology'
};

export const getPortalSettings = async (_req: Request, res: Response): Promise<any> => {
    try {
        const settings = await (prisma as any).portalSettings.upsert({
            where: { id: 1 },
            update: {},
            create: DEFAULT_SETTINGS
        });

        return res.json(settings);
    } catch (error) {
        console.error('Error fetching portal settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updatePortalSettings = async (req: Request, res: Response): Promise<any> => {
    try {
        const {
            supportEmail,
            frontendUrl,
            maintenanceMode,
            allowCompanySignup,
            smtpFromName
        } = req.body as {
            supportEmail?: string;
            frontendUrl?: string;
            maintenanceMode?: boolean;
            allowCompanySignup?: boolean;
            smtpFromName?: string;
        };

        if (!supportEmail || !frontendUrl || !smtpFromName) {
            return res.status(400).json({ message: 'supportEmail, frontendUrl and smtpFromName are required' });
        }

        const updated = await (prisma as any).portalSettings.upsert({
            where: { id: 1 },
            update: {
                supportEmail: supportEmail.trim(),
                frontendUrl: frontendUrl.trim(),
                maintenanceMode: Boolean(maintenanceMode),
                allowCompanySignup: Boolean(allowCompanySignup),
                smtpFromName: smtpFromName.trim()
            },
            create: {
                id: 1,
                supportEmail: supportEmail.trim(),
                frontendUrl: frontendUrl.trim(),
                maintenanceMode: Boolean(maintenanceMode),
                allowCompanySignup: Boolean(allowCompanySignup),
                smtpFromName: smtpFromName.trim()
            }
        });

        return res.json(updated);
    } catch (error) {
        console.error('Error updating portal settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
