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
exports.completeVerificationRequest = exports.getCompanyVerifications = exports.createVerificationRequest = void 0;
const prisma_1 = require("../config/prisma");
const generateId_1 = require("../utils/generateId");
const createVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyName, companyEmail, contactPerson, phoneNumber, studentName, usn, branch, yearOfPassing, verificationType, amount } = req.body;
        const id = yield (0, generateId_1.generateRequestId)();
        const verificationRequest = yield prisma_1.prisma.verificationRequest.create({
            data: {
                id,
                companyName,
                companyEmail,
                contactPerson,
                phoneNumber,
                studentName,
                usn,
                branch,
                yearOfPassing,
                verificationType,
                amount: Number(amount),
                paymentStatus: 'PENDING',
                status: 'PENDING'
            }
        });
        // Simulate immediate payment success for this flow
        const updatedRequest = yield prisma_1.prisma.verificationRequest.update({
            where: { id: verificationRequest.id },
            data: { paymentStatus: 'PAID' }
        });
        res.status(201).json(updatedRequest);
    }
    catch (error) {
        console.error('Error creating verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createVerificationRequest = createVerificationRequest;
const getCompanyVerifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const companyEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email;
        if (!companyEmail) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const requests = yield prisma_1.prisma.verificationRequest.findMany({
            where: { companyEmail },
            orderBy: { createdAt: 'desc' },
        });
        res.json(requests);
    }
    catch (error) {
        console.error('Error fetching company verifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getCompanyVerifications = getCompanyVerifications;
const completeVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const updated = yield prisma_1.prisma.verificationRequest.update({
            where: { id },
            data: { status: 'COMPLETED' }
        });
        // TODO: Send completion email here
        res.json(updated);
    }
    catch (error) {
        console.error('Error completing verification request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.completeVerificationRequest = completeVerificationRequest;
