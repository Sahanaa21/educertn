import PDFDocument from 'pdfkit';
import { AcknowledgementData } from './acknowledgement';

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
};

const getRequestTypeLabel = (type: AcknowledgementData['requestType']): string => {
    const typeMap: Record<AcknowledgementData['requestType'], string> = {
        CERTIFICATE: 'Certificate Request',
        VERIFICATION: 'Verification Request',
        ACADEMIC_SERVICE: 'Academic Service Request',
    };

    return typeMap[type] || 'Request';
};

const cleanText = (value: string | null | undefined): string => {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
};

const drawSectionTitle = (doc: PDFKit.PDFDocument, title: string) => {
    doc.moveDown(0.7);
    doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(12).text(title.toUpperCase(), { underline: true });
    doc.moveDown(0.4);
};

const drawKeyValue = (doc: PDFKit.PDFDocument, label: string, value: string) => {
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10).text(`${label}:`, { continued: true, width: 180 });
    doc.fillColor('#111827').font('Helvetica').fontSize(10).text(` ${value}`);
};

export const generateAcknowledgementPdf = async (data: AcknowledgementData): Promise<Buffer> => {
    return await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: {
                top: 45,
                bottom: 45,
                left: 45,
                right: 45,
            },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.rect(0, 0, doc.page.width, 96).fill('#1e3a8a');
        doc.fillColor('white').font('Helvetica-Bold').fontSize(22).text('GLOBAL ACADEMY OF TECHNOLOGY', 45, 24, {
            align: 'left',
        });
        doc.fillColor('#dbeafe').font('Helvetica').fontSize(10).text('Academic and Student Services Division', 45, 58);
        doc.fillColor('#dbeafe').font('Helvetica-Bold').fontSize(14).text('GAT', doc.page.width - 95, 34, {
            width: 50,
            align: 'right',
        });

        doc.y = 116;
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(`${getRequestTypeLabel(data.requestType)} Acknowledgement`, {
            align: 'left',
        });
        doc.moveDown(0.4);
        doc.fillColor('#475569').font('Helvetica').fontSize(10).text('Official receipt of request submission and payment confirmation.');

        doc.moveDown(0.6);
        doc.roundedRect(45, doc.y, doc.page.width - 90, 40, 6).fill('#f1f5f9');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9).text('REFERENCE NUMBER', 55, doc.y - 31);
        doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(14).text(cleanText(data.requestId), 55, doc.y - 14);

        drawSectionTitle(doc, 'Applicant Information');
        drawKeyValue(doc, 'Name', cleanText(data.name) || 'N/A');
        drawKeyValue(doc, 'Email', cleanText(data.email || data.companyEmail) || 'N/A');
        if (data.usn) {
            drawKeyValue(doc, 'USN / ID', cleanText(data.usn) || 'N/A');
        }
        if (data.companyName) {
            drawKeyValue(doc, 'Company', cleanText(data.companyName) || 'N/A');
        }

        drawSectionTitle(doc, 'Request Details');
        for (const [key, value] of Object.entries(data.details)) {
            drawKeyValue(doc, cleanText(key), cleanText(value) || 'N/A');
        }

        drawSectionTitle(doc, 'Payment Information');
        drawKeyValue(doc, 'Amount Paid', `INR ${Number(data.amount || 0).toFixed(2)}`);
        drawKeyValue(doc, 'Payment Status', 'PAID');
        drawKeyValue(doc, 'Payment Order ID', cleanText(data.paymentOrderId) || 'N/A');
        drawKeyValue(doc, 'Submitted At', formatDate(new Date(data.createdAt)));
        drawKeyValue(doc, 'Generated At', formatDate(new Date()));

        doc.moveDown(0.8);
        doc.roundedRect(45, doc.y, doc.page.width - 90, 62, 6).fill('#eff6ff');
        doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(10).text('IMPORTANT NOTICE', 55, doc.y - 53);
        doc.fillColor('#1e3a8a').font('Helvetica').fontSize(9).text(
            'This acknowledgement confirms that your paid request has been received by the institution and queued for processing. Keep this document as proof of successful application submission.',
            55,
            doc.y - 36,
            { width: doc.page.width - 110, align: 'left' }
        );

        const footerY = doc.page.height - 62;
        doc.rect(0, footerY, doc.page.width, 62).fill('#f8fafc');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10).text('Global Academy of Technology', 45, footerY + 16);
        doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Electronically generated document. Signature not required.', 45, footerY + 31);
        doc.fillColor('#334155').font('Helvetica').fontSize(8).text('Authorized by: Administrator, Portal System', doc.page.width - 230, footerY + 31);

        doc.end();
    });
};
