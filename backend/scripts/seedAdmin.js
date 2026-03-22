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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const hashPassword = (plainPassword) => {
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const hash = crypto_1.default
        .scryptSync(plainPassword, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
        .toString('hex');
    return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
};
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const adminEmail = 'admin@gat.ac.in';
        const adminPassword = 'admin123';
        const hashedPassword = hashPassword(adminPassword);
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
                    password: hashedPassword,
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
                    password: hashedPassword,
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
