import { prisma } from '../config/prisma';

export const generateRequestId = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `GAT-${year}-`;

    // We need to find the latest ID from both CertificateRequest and VerificationRequest for this year
    const lastCert = await prisma.certificateRequest.findFirst({
        where: { id: { startsWith: prefix } },
        orderBy: { id: 'desc' }
    });

    const lastVer = await prisma.verificationRequest.findFirst({
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
};
