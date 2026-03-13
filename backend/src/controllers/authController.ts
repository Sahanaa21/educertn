import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generateToken } from '../utils/auth';
import { sendEmail } from '../utils/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isInvalidRecipientError = (error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();

    return [
        'recipient rejected',
        'user unknown',
        'invalid recipient',
        'no such user',
        'mailbox unavailable',
        '550',
        '553',
        '5.1.1',
        '5.1.0',
    ].some((part) => message.includes(part));
};

export const studentLogin = async (req: Request, res: Response): Promise<any> => {
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
        return res.status(400).json({ message: 'Email is required' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
    }

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await sendEmail(
            normalizedEmail,
            'Your OTP for Global Academy of Technology',
            `<p>Your One-Time Password (OTP) for Global Academy of Technology is:</p>
             <h2 style="font-size: 32px; font-weight: bold; color: #000;">${otp}</h2>
             <p>This OTP expires in 10 minutes.</p>
               <p>If you did not request this, please ignore this email.</p>`
           );

        let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            user = await prisma.user.create({
                data: { email: normalizedEmail, role: 'STUDENT' }
            });
        }

        await prisma.oTP.create({
            data: {
                email: normalizedEmail,
                otp,
                expiresAt
            }
        });

        res.json({ message: 'OTP sent to your email. Check your inbox.' });
    } catch (error) {
        console.error('Student login OTP send failed:', error);
        if (isInvalidRecipientError(error)) {
            return res.status(400).json({ message: 'Invalid email entered. Please check and try again.' });
        }
        res.status(500).json({ message: 'Failed to send OTP. Please verify the email address and try again.' });
    }
};

export const companyLogin = async (req: Request, res: Response): Promise<any> => {
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
        return res.status(400).json({ message: 'Email is required' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Enter a valid company email address' });
    }

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await sendEmail(
            normalizedEmail,
            'Your Company Verification OTP - Global Academy of Technology',
            `<p>Your One-Time Password (OTP) for company verification is:</p>
             <h2 style="font-size: 32px; font-weight: bold; color: #000;">${otp}</h2>
             <p>This OTP expires in 10 minutes.</p>
               <p>If you did not request this, please ignore this email.</p>`
           );

        let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            user = await prisma.user.create({
                data: { email: normalizedEmail, role: 'COMPANY' }
            });
        }

        await prisma.oTP.create({
            data: {
                email: normalizedEmail,
                otp,
                expiresAt
            }
        });

        res.json({ message: 'OTP sent to your company email. Check your inbox.' });
    } catch (error) {
        console.error('Company login OTP send failed:', error);
        if (isInvalidRecipientError(error)) {
            return res.status(400).json({ message: 'Invalid email entered. Please check and try again.' });
        }
        res.status(500).json({ message: 'Failed to send OTP to company email. Please verify the email address.' });
    }
};
export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '').trim();

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
    }

    if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: 'OTP must be exactly 6 digits' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        const validOtp = await prisma.oTP.findFirst({
            where: { email, otp },
            orderBy: { createdAt: 'desc' }
        });

        if (!validOtp || validOtp.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = generateToken({ id: user.id, role: user.role });

        await prisma.oTP.deleteMany({ where: { email } });

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const adminLogin = async (req: Request, res: Response): Promise<any> => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }

    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email, role: 'ADMIN' } });

        if (!user || user.password !== password) {
            await sleep(400);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken({ id: user.id, role: user.role }, '8h');

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const changeAdminPassword = async (req: Request, res: Response): Promise<any> => {
    const adminId = (req as any).user?.id;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return res.status(400).json({ message: 'New password must be at least 8 characters and include letters and numbers' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: adminId } });
        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (user.password !== currentPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        await prisma.user.update({ where: { id: adminId }, data: { password: newPassword } });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
