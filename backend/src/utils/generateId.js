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
exports.generateRequestId = void 0;
const prisma_1 = require("../config/prisma");
const generateRequestId = () => __awaiter(void 0, void 0, void 0, function* () {
    const year = new Date().getFullYear();
    const prefix = `GAT-${year}-`;
    // We need to find the latest ID from both CertificateRequest and VerificationRequest for this year
    const lastCert = yield prisma_1.prisma.certificateRequest.findFirst({
        where: { id: { startsWith: prefix } },
        orderBy: { id: 'desc' }
    });
    const lastVer = yield prisma_1.prisma.verificationRequest.findFirst({
        where: { id: { startsWith: prefix } },
        orderBy: { id: 'desc' }
    });
    let maxNumber = 0;
    if (lastCert) {
        const numStr = lastCert.id.replace(prefix, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
        }
    }
    if (lastVer) {
        const numStr = lastVer.id.replace(prefix, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
        }
    }
    const nextNumber = maxNumber + 1;
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${formattedNumber}`;
});
exports.generateRequestId = generateRequestId;
