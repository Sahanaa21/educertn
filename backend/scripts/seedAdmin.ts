import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin@gat.ac.in';

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
                password: null,
                name: 'GAT Administrator',
                role: 'ADMIN',
            }
        });
        console.log('✅ Admin user created successfully.');
    } else {
        console.log('Admin user already exists. Ensuring admin role is configured...');
        await prisma.user.update({
            where: { email: adminEmail },
            data: {
                password: null,
                role: 'ADMIN' // Just in case it was created as a student
            }
        });
        console.log('✅ Admin user role updated successfully.');
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
