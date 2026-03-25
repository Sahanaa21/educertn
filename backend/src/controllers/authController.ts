import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { generateToken, verifyToken } from '../utils/auth';
import { sendEmail } from '../utils/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const BRANCH_OPTIONS = new Set([
    'CSE',
    'ISE',
    'ECE',
    'EEE',
    'ME',
    'AIDS',
    'AIML',
    'CSE(AIML)',
    'CIVIL',
    'AERONAUTICAL',
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_ADMIN_ALLOWLIST = ['sahanaa2060@gmail.com'];

const parseAdminAllowlist = (raw: string | null | undefined) => {
    return String(raw || '')
        .split(/[\n,;]/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => EMAIL_REGEX.test(item));
};

const getAdminAllowlist = async () => {
    const allowlist = new Set(DEFAULT_ADMIN_ALLOWLIST);

    try {
        const settings = await (prisma as any).portalSettings.findUnique({
            where: { id: 1 },
            select: { adminAllowedEmails: true }
        });

        for (const email of parseAdminAllowlist(settings?.adminAllowedEmails)) {
            allowlist.add(email);
        }
    } catch {
        // Fall back to the default allowlist when settings are unavailable.
    }

    return allowlist;
};

const isAllowlistedAdminEmail = async (email: string) => {
    const allowlist = await getAdminAllowlist();
    return allowlist.has(email.toLowerCase());
};

const getDestinationByRole = (role: string) => {
    if (role === 'ADMIN') return '/admin';
    if (role === 'COMPANY') return '/company';
    return '/student';
};

const sendOtpEmail = async (normalizedEmail: string, subject: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await sendEmail(
        normalizedEmail,
        subject,
        `<p>Your One-Time Password (OTP) is:</p>
         <h2 style="font-size: 32px; font-weight: bold; color: #000;">${otp}</h2>
         <p>This OTP expires in 10 minutes.</p>
         <p>If you did not request this, please ignore this email.</p>`
    );

    await prisma.oTP.deleteMany({ where: { email: normalizedEmail } });
    await prisma.oTP.create({
        data: {
            email: normalizedEmail,
            otp,
            expiresAt
        }
    });
};

const safeCompareStrings = (a: string, b: string) => {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(aBuffer, bBuffer);
};

const hashPassword = (plainPassword: string) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
        .scryptSync(plainPassword, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
        .toString('hex');

    return `${SCRYPT_PREFIX}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
};

const isScryptHash = (value: string | null | undefined) => {
    return typeof value === 'string' && value.startsWith(`${SCRYPT_PREFIX}$`);
};

const verifyPassword = (plainPassword: string, storedPassword: string | null | undefined) => {
    if (!storedPassword) {
        return false;
    }

    if (!isScryptHash(storedPassword)) {
        return safeCompareStrings(plainPassword, storedPassword);
    }

    try {
        const [prefix, n, r, p, salt, storedHash] = storedPassword.split('$');

        if (!prefix || !n || !r || !p || !salt || !storedHash) {
            return false;
        }

        const derivedHash = crypto
            .scryptSync(plainPassword, salt, Buffer.from(storedHash, 'hex').length, {
                N: Number(n),
                r: Number(r),
                p: Number(p),
            })
            .toString('hex');

        return safeCompareStrings(derivedHash, storedHash);
    } catch {
        return false;
    }
};

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

        // Keep only one active OTP per email to avoid accepting stale codes.
        await prisma.oTP.deleteMany({ where: { email: normalizedEmail } });

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

        // Keep only one active OTP per email to avoid accepting stale codes.
        await prisma.oTP.deleteMany({ where: { email: normalizedEmail } });

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

        const latestOtp = await prisma.oTP.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' }
        });

        if (!latestOtp || latestOtp.expiresAt < new Date() || latestOtp.otp !== otp) {
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

export const requestUnifiedOtp = async (req: Request, res: Response): Promise<any> => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const intent = String(req.body?.intent || 'login').trim().toLowerCase();

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
    }

    if (!['login', 'signup'].includes(intent)) {
        return res.status(400).json({ message: 'Invalid intent' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        const adminEmail = await isAllowlistedAdminEmail(email);

        if (intent === 'signup' && existingUser) {
            return res.status(409).json({ message: 'This email is already registered. Please login instead.' });
        }

        if (intent === 'login' && !existingUser && !adminEmail) {
            return res.status(404).json({ message: 'Email is not registered. Please sign up first.' });
        }

        await sendOtpEmail(email, 'Your OTP for Global Academy of Technology');

        return res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Unified OTP request failed:', error);
        if (isInvalidRecipientError(error)) {
            return res.status(400).json({ message: 'Invalid email entered. Please check and try again.' });
        }
        return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
};

export const verifyUnifiedOtp = async (req: Request, res: Response): Promise<any> => {
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
        const latestOtp = await prisma.oTP.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' }
        });

        if (!latestOtp || latestOtp.expiresAt < new Date() || latestOtp.otp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        let user = await prisma.user.findUnique({ where: { email } });
        const adminEmail = await isAllowlistedAdminEmail(email);

        if (!user && adminEmail) {
            user = await prisma.user.create({
                data: {
                    email,
                    role: 'ADMIN',
                    name: 'Admin'
                }
            });
        }

        if (!user) {
            await prisma.oTP.deleteMany({ where: { email } });
            const registrationToken = generateToken({ email, purpose: 'PROFILE_SETUP' }, '20m');
            return res.json({
                requiresRegistration: true,
                registrationToken,
                message: 'OTP verified. Complete profile to continue.'
            });
        }

        if (adminEmail && user.role !== 'ADMIN') {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { role: 'ADMIN' }
            });
        }

        const profileComplete = user.role === 'ADMIN'
            ? true
            : user.role === 'STUDENT'
                ? Boolean(await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } }))
                : Boolean(await prisma.companyProfile.findUnique({ where: { userId: user.id }, select: { id: true } }));

        await prisma.oTP.deleteMany({ where: { email } });

        if (!profileComplete) {
            const registrationToken = generateToken({ email, userId: user.id, purpose: 'PROFILE_SETUP' }, '20m');
            return res.json({
                requiresRegistration: true,
                role: user.role,
                registrationToken,
                message: 'OTP verified. Complete profile to continue.'
            });
        }

        const token = generateToken({ id: user.id, role: user.role });
        return res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            destination: getDestinationByRole(user.role),
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Unified OTP verify failed:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const completeUnifiedProfile = async (req: Request, res: Response): Promise<any> => {
    const registrationToken = String(req.body?.registrationToken || '');
    const role = String(req.body?.role || '').toUpperCase();
    const name = String(req.body?.name || '').trim();
    const usn = String(req.body?.usn || '').trim().toUpperCase();
    const branch = String(req.body?.branch || '').trim().toUpperCase();
    const yearOfPassing = String(req.body?.yearOfPassing || '').trim();
    const phoneNumber = String(req.body?.phoneNumber || '').trim();
    const companyName = String(req.body?.companyName || '').trim();
    const contactPerson = String(req.body?.contactPerson || '').trim();

    if (!registrationToken) {
        return res.status(400).json({ message: 'Registration token is required' });
    }

    const decoded = verifyToken(registrationToken) as any;
    if (!decoded || decoded.purpose !== 'PROFILE_SETUP' || !decoded.email) {
        return res.status(401).json({ message: 'Invalid or expired registration token' });
    }

    if (!['STUDENT', 'COMPANY'].includes(role)) {
        return res.status(400).json({ message: 'Select a valid role' });
    }

    if (!name || name.length < 3) {
        return res.status(400).json({ message: 'Enter a valid full name' });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
        return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }

    try {
        let user = await prisma.user.findUnique({ where: { email: String(decoded.email).toLowerCase() } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: String(decoded.email).toLowerCase(),
                    name,
                    role: role as any
                }
            });
        }

        if (await isAllowlistedAdminEmail(user.email)) {
            return res.status(400).json({ message: 'This email is reserved for admin access only.' });
        }

        if (role === 'STUDENT') {
            if (!usn || usn.length < 6) {
                return res.status(400).json({ message: 'Enter a valid USN' });
            }
            if (!BRANCH_OPTIONS.has(branch)) {
                return res.status(400).json({ message: 'Select a valid branch' });
            }
            if (!/^\d{4}$/.test(yearOfPassing)) {
                return res.status(400).json({ message: 'Enter a valid year of passing' });
            }

            await prisma.user.update({ where: { id: user.id }, data: { role: 'STUDENT', name } });
            await prisma.studentProfile.upsert({
                where: { userId: user.id },
                update: { usn, branch, yearOfPassing, phoneNumber },
                create: { userId: user.id, usn, branch, yearOfPassing, phoneNumber }
            });
        }

        if (role === 'COMPANY') {
            if (!companyName || companyName.length < 2) {
                return res.status(400).json({ message: 'Enter a valid company name' });
            }
            if (!contactPerson || contactPerson.length < 2) {
                return res.status(400).json({ message: 'Enter a valid contact person name' });
            }

            await prisma.user.update({ where: { id: user.id }, data: { role: 'COMPANY', name } });
            await prisma.companyProfile.upsert({
                where: { userId: user.id },
                update: { companyName, contactPerson, phoneNumber },
                create: { userId: user.id, companyName, contactPerson, phoneNumber }
            });
        }

        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
        const token = generateToken({ id: user.id, role: updatedUser?.role || role });

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name,
                role: updatedUser?.role || role,
            },
            destination: getDestinationByRole(updatedUser?.role || role),
            message: 'Registration completed successfully'
        });
    } catch (error) {
        console.error('Complete profile failed:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getCurrentProfile = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = String((req as any).user?.id || '');
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'STUDENT') {
            const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
            return res.json({ user, studentProfile });
        }

        if (user.role === 'COMPANY') {
            const companyProfile = await prisma.companyProfile.findUnique({ where: { userId: user.id } });
            return res.json({ user, companyProfile });
        }

        return res.json({ user });
    } catch (error) {
        console.error('Get profile failed:', error);
        return res.status(500).json({ message: 'Server error' });
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

        if (!user || !verifyPassword(password, user.password)) {
            await sleep(400);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!isScryptHash(user.password)) {
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashPassword(password) }
            });
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

        if (!verifyPassword(currentPassword, user.password)) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        if (verifyPassword(newPassword, user.password)) {
            return res.status(400).json({ message: 'New password must be different from the current password' });
        }

        await prisma.user.update({ where: { id: adminId }, data: { password: hashPassword(newPassword) } });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
