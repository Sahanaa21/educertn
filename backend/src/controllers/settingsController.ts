import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ADMIN_ALLOWLIST = String(process.env.ADMIN_BOOTSTRAP_EMAILS || '')
    .split(/[\n,;]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => EMAIL_REGEX.test(item));

const parseAdminAllowlist = (raw: string | null | undefined): string[] => {
    const parsed = String(raw || '')
        .split(/[\n,;]/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => EMAIL_REGEX.test(email));

    return Array.from(new Set(parsed));
};

const mergeAllowlistWithDefaults = (allowlist: string[]) => {
    return Array.from(new Set([...DEFAULT_ADMIN_ALLOWLIST, ...allowlist]));
};

const defaultFrontendUrl = process.env.FRONTEND_URL?.trim()
    || process.env.FRONTEND_URLS?.split(',').map((url) => url.trim()).find(Boolean)
    || 'https://gat-verification-portal.vercel.app';

const DEFAULT_SETTINGS = {
    id: 1,
    supportEmail: 'support@gat.ac.in',
    frontendUrl: defaultFrontendUrl,
    maintenanceMode: false,
    allowCompanySignup: true,
    smtpFromName: 'Global Academy of Technology',
    adminAllowedEmails: DEFAULT_ADMIN_ALLOWLIST.join('\n')
};

export const getPortalSettings = async (_req: Request, res: Response): Promise<any> => {
    try {
        const settings = await (prisma as any).portalSettings.upsert({
            where: { id: 1 },
            update: {},
            create: DEFAULT_SETTINGS
        });

        const normalizedAllowlist = mergeAllowlistWithDefaults(
            parseAdminAllowlist(settings?.adminAllowedEmails)
        );

        return res.json({
            ...settings,
            adminAllowedEmails: normalizedAllowlist.join('\n')
        });
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
            smtpFromName,
            adminAllowedEmails
        } = req.body as {
            supportEmail?: string;
            frontendUrl?: string;
            maintenanceMode?: boolean;
            allowCompanySignup?: boolean;
            smtpFromName?: string;
            adminAllowedEmails?: string;
        };

        if (!supportEmail || !frontendUrl || !smtpFromName) {
            return res.status(400).json({ message: 'supportEmail, frontendUrl and smtpFromName are required' });
        }

        const mergedAllowlist = mergeAllowlistWithDefaults(parseAdminAllowlist(adminAllowedEmails));

        const updated = await (prisma as any).portalSettings.upsert({
            where: { id: 1 },
            update: {
                supportEmail: supportEmail.trim(),
                frontendUrl: frontendUrl.trim(),
                maintenanceMode: Boolean(maintenanceMode),
                allowCompanySignup: Boolean(allowCompanySignup),
                smtpFromName: smtpFromName.trim(),
                adminAllowedEmails: mergedAllowlist.join('\n')
            },
            create: {
                id: 1,
                supportEmail: supportEmail.trim(),
                frontendUrl: frontendUrl.trim(),
                maintenanceMode: Boolean(maintenanceMode),
                allowCompanySignup: Boolean(allowCompanySignup),
                smtpFromName: smtpFromName.trim(),
                adminAllowedEmails: mergedAllowlist.join('\n')
            }
        });

        return res.json({
            ...updated,
            adminAllowedEmails: mergedAllowlist.join('\n')
        });
    } catch (error) {
        console.error('Error updating portal settings:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const registerAdminEmail = async (req: Request, res: Response): Promise<any> => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: 'Enter a valid email address' });
        }

        const settings = await (prisma as any).portalSettings.upsert({
            where: { id: 1 },
            update: {},
            create: DEFAULT_SETTINGS
        });

        const currentAllowlist = mergeAllowlistWithDefaults(parseAdminAllowlist(settings?.adminAllowedEmails));
        if (!currentAllowlist.includes(email)) {
            currentAllowlist.push(email);
        }

        await (prisma as any).portalSettings.update({
            where: { id: 1 },
            data: { adminAllowedEmails: currentAllowlist.join('\n') }
        });

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (!existingUser) {
            await prisma.user.create({
                data: {
                    email,
                    role: 'ADMIN',
                    name: 'Admin'
                }
            });
        } else if (existingUser.role !== 'ADMIN') {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { role: 'ADMIN' }
            });
        }

        return res.json({
            message: 'Admin email registered successfully',
            adminAllowedEmails: currentAllowlist.join('\n')
        });
    } catch (error) {
        console.error('Error registering admin email:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const removeAdminEmail = async (req: Request, res: Response): Promise<any> => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: 'Enter a valid email address' });
        }

        const settings = await (prisma as any).portalSettings.upsert({
            where: { id: 1 },
            update: {},
            create: DEFAULT_SETTINGS
        });

        const currentAllowlist = mergeAllowlistWithDefaults(parseAdminAllowlist(settings?.adminAllowedEmails));
        if (!currentAllowlist.includes(email)) {
            return res.status(404).json({ message: 'Admin email not found in allowlist' });
        }

        if (currentAllowlist.length <= 1) {
            return res.status(400).json({ message: 'Cannot remove the last admin email' });
        }

        const authUserId = String((req as any).user?.id || '').trim();
        if (authUserId) {
            const currentAdmin = await prisma.user.findUnique({ where: { id: authUserId }, select: { email: true } });
            if (currentAdmin?.email?.toLowerCase() === email) {
                return res.status(400).json({ message: 'You cannot remove your own admin email while signed in' });
            }
        }

        const nextAllowlist = currentAllowlist.filter((entry) => entry !== email);

        await (prisma as any).portalSettings.update({
            where: { id: 1 },
            data: { adminAllowedEmails: nextAllowlist.join('\n') }
        });

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser?.role === 'ADMIN') {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { role: 'STUDENT' }
            });
        }

        return res.json({
            message: 'Admin email removed successfully',
            adminAllowedEmails: nextAllowlist.join('\n')
        });
    } catch (error) {
        console.error('Error removing admin email:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
