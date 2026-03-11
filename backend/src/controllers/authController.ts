import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generateToken } from '../utils/auth';
import { sendEmail } from '../utils/email';

const otpFallbackEnabled = process.env.OTP_FALLBACK_ENABLED === 'true';
const otpIncludeInResponse = process.env.OTP_INCLUDE_IN_RESPONSE === 'true';

async function sendOtpOrFallback(email: string, subject: string, body: string, otp: string) {
    try {
        await sendEmail(email, subject, body);
        return { delivered: true as const };
    } catch (error) {
        console.error('OTP email send failed:', error);

        if (!otpFallbackEnabled) {
            throw error;
        }

        // Keep authentication usable during SMTP outages when explicitly enabled.
        return {
            delivered: false as const,
            otpPreview: otpIncludeInResponse ? otp : undefined,
        };
    }
}

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

        const delivery = await sendOtpOrFallback(
            email,
            'Your OTP for Global Academy of Technology',
            `Your OTP is ${otp}. It expires in 10 minutes.`,
            otp
        );

        if (delivery.delivered) {
            res.json({ message: 'OTP sent to email' });
            return;
        }

        res.json({
            message: 'Email delivery is temporarily unavailable. OTP fallback is active.',
            ...(delivery.otpPreview ? { otp: delivery.otpPreview } : {}),
        });
    } catch (error) {
        console.error('Student OTP send failed:', error);
        res.status(500).json({ message: 'Unable to send OTP email. Please try again in a minute.' });
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

        const delivery = await sendOtpOrFallback(
            email,
            'Your Company OTP for Global Academy of Technology Verification',
            `Your verification OTP is ${otp}. It expires in 10 minutes.`,
            otp
        );

        if (delivery.delivered) {
            res.json({ message: 'OTP sent to company email' });
            return;
        }

        res.json({
            message: 'Email delivery is temporarily unavailable. OTP fallback is active.',
            ...(delivery.otpPreview ? { otp: delivery.otpPreview } : {}),
        });
    } catch (error) {
        console.error('Company OTP send failed:', error);
        res.status(500).json({ message: 'Unable to send OTP email. Please try again in a minute.' });
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
