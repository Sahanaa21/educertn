import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

const hashPassword = (plainPassword: string) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
        .scryptSync(plainPassword, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
        .toString('hex');

    return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
};

async function main() {
    const adminEmail = 'admin@gat.ac.in';
    const adminPassword = 'admin123';
    const hashedPassword = hashPassword(adminPassword);

    console.log(`Checking if admin user ${adminEmail} exists...`);

    // Check if user exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    if (!existingAdmin) {
        console.log('Admin user not found. Creating a new one...');
        await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                name: 'GAT Administrator',
                role: 'ADMIN',
            }
        });
        console.log('✅ Admin user created successfully.');
    } else {
        console.log('Admin user already exists. Updating password to ensure it matches...');
        await prisma.user.update({
            where: { email: adminEmail },
            data: {
                password: hashedPassword,
                role: 'ADMIN' // Just in case it was created as a student
            }
        });
        console.log('✅ Admin user password updated successfully.');
    }
}

main()
    .catch((e) => {
        console.error('❌ Error seeding admin user:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
