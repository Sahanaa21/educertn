import PDFDocument from 'pdfkit';
import { AcknowledgementData } from './acknowledgement';
import { getAcknowledgementLogoPath } from './acknowledgementAssets';

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

const drawKeyValue = (doc: PDFKit.PDFDocument, label: string, value: string, contentLeft: number, contentWidth: number) => {
    const labelWidth = 155;
    const valueX = contentLeft + labelWidth;
    const rowY = doc.y;
    const valueWidth = Math.max(180, contentWidth - labelWidth);

    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10).text(`${label}:`, contentLeft, rowY, {
        width: labelWidth - 10,
    });
    doc.fillColor('#111827').font('Helvetica').fontSize(10).text(value, valueX, rowY, {
        width: valueWidth,
    });

    const labelHeight = doc.heightOfString(`${label}:`, { width: labelWidth - 10 });
    const valueHeight = doc.heightOfString(value, { width: valueWidth });
    doc.y = rowY + Math.max(labelHeight, valueHeight) + 4;
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

        const logoPath = getAcknowledgementLogoPath();
        const contentLeft = doc.page.margins.left;
        const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        doc.rect(0, 0, doc.page.width, 96).fill('#1e3a8a');
        if (logoPath) {
            try {
                doc.image(logoPath, 52, 18, { fit: [58, 58] });
            } catch {
                doc.fillColor('white').font('Helvetica-Bold').fontSize(22).text('GAT', 52, 36, { width: 58, align: 'center' });
            }
        } else {
            doc.fillColor('white').font('Helvetica-Bold').fontSize(22).text('GAT', 52, 36, { width: 58, align: 'center' });
        }

        doc.fillColor('white').font('Helvetica-Bold').fontSize(20).text('GLOBAL ACADEMY OF TECHNOLOGY', 122, 28, {
            align: 'left',
        });
        doc.fillColor('#dbeafe').font('Helvetica').fontSize(10).text('Academic and Student Services Division', 122, 54);
        doc.fillColor('#dbeafe').font('Helvetica-Bold').fontSize(12).text('Autonomous Institute, Affiliated to VTU', 122, 68);

        let cursorY = 116;
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(`${getRequestTypeLabel(data.requestType)} Acknowledgement`, contentLeft, cursorY, {
            width: contentWidth,
            align: 'left',
        });
        cursorY = doc.y + 6;
        doc.fillColor('#475569').font('Helvetica').fontSize(10).text('Official receipt of request submission and payment confirmation.', contentLeft, cursorY, {
            width: contentWidth,
        });
        cursorY = doc.y + 14;

        const referenceTop = cursorY;
        doc.roundedRect(contentLeft, referenceTop, contentWidth, 56, 6).fill('#f1f5f9');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9).text('REFERENCE NUMBER', contentLeft + 10, referenceTop + 10, {
            width: contentWidth - 20,
        });
        doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(14).text(cleanText(data.requestId), contentLeft + 10, referenceTop + 24, {
            width: contentWidth - 20,
        });
        cursorY = referenceTop + 72;

        doc.y = cursorY;

        drawSectionTitle(doc, 'Applicant Information');
        drawKeyValue(doc, 'Name', cleanText(data.name) || 'N/A', contentLeft, contentWidth);
        drawKeyValue(doc, 'Email', cleanText(data.email || data.companyEmail) || 'N/A', contentLeft, contentWidth);
        if (data.usn) {
            drawKeyValue(doc, 'USN / ID', cleanText(data.usn) || 'N/A', contentLeft, contentWidth);
        }
        if (data.companyName) {
            drawKeyValue(doc, 'Company', cleanText(data.companyName) || 'N/A', contentLeft, contentWidth);
        }

        drawSectionTitle(doc, 'Request Details');
        for (const [key, value] of Object.entries(data.details)) {
            drawKeyValue(doc, cleanText(key), cleanText(value) || 'N/A', contentLeft, contentWidth);
        }

        drawSectionTitle(doc, 'Payment Information');
        drawKeyValue(doc, 'Amount Paid', `INR ${Number(data.amount || 0).toFixed(2)}`, contentLeft, contentWidth);
        drawKeyValue(doc, 'Payment Status', 'PAID', contentLeft, contentWidth);
        drawKeyValue(doc, 'Payment Order ID', cleanText(data.paymentOrderId) || 'N/A', contentLeft, contentWidth);
        drawKeyValue(doc, 'Submitted At', formatDate(new Date(data.createdAt)), contentLeft, contentWidth);
        drawKeyValue(doc, 'Generated At', formatDate(new Date()), contentLeft, contentWidth);

        cursorY = doc.y + 8;
        const noticeHeight = 86;
        doc.roundedRect(contentLeft, cursorY, contentWidth, noticeHeight, 6).fill('#eff6ff');
        doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(10).text('IMPORTANT NOTICE', contentLeft + 10, cursorY + 10, {
            width: contentWidth - 20,
        });
        doc.fillColor('#1e3a8a').font('Helvetica').fontSize(9).text(
            'This acknowledgement confirms that your paid request has been received by the institution and queued for processing. Keep this document as proof of successful application submission.',
            contentLeft + 10,
            cursorY + 28,
            { width: contentWidth - 20, align: 'left' }
        );
        doc.y = cursorY + noticeHeight + 14;

        const footerY = doc.page.height - 62;
        doc.rect(0, footerY, doc.page.width, 62).fill('#f8fafc');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10).text('Global Academy of Technology', 45, footerY + 16);
        doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Electronically generated document. Signature not required.', 45, footerY + 31);
        doc.fillColor('#334155').font('Helvetica').fontSize(8).text('Authorized by: Administrator, Portal System', doc.page.width - 230, footerY + 31);

        doc.end();
    });
};
