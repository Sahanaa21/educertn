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
exports.completeCertificateRequest = exports.getStudentRequests = exports.createCertificateRequest = void 0;
const prisma_1 = require("../config/prisma");
const generateId_1 = require("../utils/generateId");
const createCertificateRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const file = req.file;
        // In a real app you would upload this to Cloudinary. For now, we mock the URL.
        const idProofUrl = file ? `/uploads/${file.filename}` : undefined;
        const body = req.body;
        const usn = body.usn;
        const studentName = body.studentName;
        const branch = body.branch;
        const yearOfPassing = body.yearOfPassing;
        const certificateType = body.certificateType;
        const copyType = body.copyType;
        const copies = Number(body.copies) || 1;
        const reason = body.reason || undefined;
        const address = body.address || undefined;
        const amount = Number(body.amount) || 0;
        const id = yield (0, generateId_1.generateRequestId)();
        const certificateRequest = yield prisma_1.prisma.certificateRequest.create({
            data: {
                id,
                userId,
                usn,
                studentName,
                branch,
                yearOfPassing,
                certificateType,
                copyType,
                copies,
                reason,
                address,
                idProofUrl,
                amount,
                paymentStatus: 'PENDING',
                status: 'PENDING'
            }
        });
        // Simulate immediate payment success for this flow
        const updatedRequest = yield prisma_1.prisma.certificateRequest.update({
            where: { id: certificateRequest.id },
            data: { paymentStatus: 'PAID' }
        });
        res.status(201).json(updatedRequest);
    }
    catch (error) {
        console.error('Error creating certificate request:', error);
        res.status(500).json({ message: error.message || 'Internal server error', details: error });
    }
});
exports.createCertificateRequest = createCertificateRequest;
const getStudentRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const requests = yield prisma_1.prisma.certificateRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    }
    catch (error) {
        console.error('Error fetching student requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getStudentRequests = getStudentRequests;
const completeCertificateRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const updated = yield prisma_1.prisma.certificateRequest.update({
            where: { id },
            data: { status: 'COMPLETED' },
            include: { user: true }
        });
        // TODO: Send completion email here
        res.json(updated);
    }
    catch (error) {
        console.error('Error completing request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.completeCertificateRequest = completeCertificateRequest;
