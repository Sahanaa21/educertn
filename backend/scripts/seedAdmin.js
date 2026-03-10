"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const adminEmail = 'admin@gat.ac.in';
        const adminPassword = 'admin123';
        console.log(`Checking if admin user ${adminEmail} exists...`);
        // Check if user exists
        const existingAdmin = yield prisma.user.findUnique({
            where: { email: adminEmail }
        });
        if (!existingAdmin) {
            console.log('Admin user not found. Creating a new one...');
            yield prisma.user.create({
                data: {
                    email: adminEmail,
                    password: adminPassword,
                    name: 'GAT Administrator',
                    role: 'ADMIN',
                }
            });
            console.log('✅ Admin user created successfully.');
        }
        else {
            console.log('Admin user already exists. Updating password to ensure it matches...');
            yield prisma.user.update({
                where: { email: adminEmail },
                data: {
                    password: adminPassword,
                    role: 'ADMIN' // Just in case it was created as a student
                }
            });
            console.log('✅ Admin user password updated successfully.');
        }
    });
}
main()
    .catch((e) => {
    console.error('❌ Error seeding admin user:', e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
