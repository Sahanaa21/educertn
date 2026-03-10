import { prisma } from '../config/prisma';

export const generateRequestId = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `GAT-${year}-`;

    // Certificate IDs are stored directly in certificateRequest.id.
    const lastCert = await prisma.certificateRequest.findFirst({
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

    const nextNumber = maxNumber + 1;
    const formattedNumber = nextNumber.toString().padStart(4, '0');

    return `${prefix}${formattedNumber}`;
};

export const generateVerificationRequestId = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `GAT-VER-${year}-`;

    const lastVerification = await prisma.verificationRequest.findFirst({
        where: { requestId: { startsWith: prefix } },
        orderBy: { requestId: 'desc' }
    });

    let maxNumber = 0;

    if (lastVerification?.requestId) {
        const numStr = lastVerification.requestId.replace(prefix, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
        }
    }

    const nextNumber = maxNumber + 1;
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${formattedNumber}`;
};
