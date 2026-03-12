import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generateToken } from '../utils/auth';
import { sendEmail } from '../utils/email';

export const studentLogin = async (req: Request, res: Response): Promise<any> => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            user = await prisma.user.create({
                data: { email, role: 'STUDENT' }
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await prisma.oTP.create({
            data: {
                email,
                otp,
                expiresAt
            }
        });

        // Do not block login flow on SMTP latency.
        void sendEmail(
            email,
            'Your OTP for Global Academy of Technology',
            `<p>Your One-Time Password (OTP) for Global Academy of Technology is:</p>
             <h2 style="font-size: 32px; font-weight: bold; color: #000;">${otp}</h2>
             <p>This OTP expires in 10 minutes.</p>
             <p>If you did not request this, please ignore this email.</p>`
        ).catch((error) => {
            console.error('Student OTP email dispatch failed:', error);
        });

        res.json({ message: 'OTP sent to your email. Check your inbox.' });
    } catch (error) {
        console.error('Student login OTP send failed:', error);
        res.status(500).json({ message: 'Failed to send OTP. Please check your email address and try again.' });
    }
};

export const companyLogin = async (req: Request, res: Response): Promise<any> => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            user = await prisma.user.create({
                data: { email, role: 'COMPANY' }
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await prisma.oTP.create({
            data: {
                email,
                otp,
                expiresAt
            }
        });

        // Do not block login flow on SMTP latency.
        void sendEmail(
            email,
            'Your Company Verification OTP - Global Academy of Technology',
            `<p>Your One-Time Password (OTP) for company verification is:</p>
             <h2 style="font-size: 32px; font-weight: bold; color: #000;">${otp}</h2>
             <p>This OTP expires in 10 minutes.</p>
             <p>If you did not request this, please ignore this email.</p>`
        ).catch((error) => {
            console.error('Company OTP email dispatch failed:', error);
        });

        res.json({ message: 'OTP sent to your company email. Check your inbox.' });
    } catch (error) {
        console.error('Company login OTP send failed:', error);
        res.status(500).json({ message: 'Failed to send OTP to company email. Please verify the email address.' });
    }
};
export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    try {
        const validOtp = await prisma.oTP.findFirst({
            where: { email, otp },
            orderBy: { createdAt: 'desc' }
        });

        if (!validOtp || validOtp.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

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
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email, role: 'ADMIN' } });

        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken({ id: user.id, role: user.role });

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const changeAdminPassword = async (req: Request, res: Response): Promise<any> => {
    const adminId = (req as any).user?.id;
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
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
