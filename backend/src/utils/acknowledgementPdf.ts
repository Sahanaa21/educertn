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

const drawSectionTitleAt = (doc: PDFKit.PDFDocument, title: string, left: number, width: number, top: number): number => {
    const textHeight = doc.heightOfString(title.toUpperCase(), { width });
    doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(12).text(title.toUpperCase(), left, top, {
        width,
        underline: true,
    });
    return top + textHeight + 10;
};

const drawKeyValueAt = (doc: PDFKit.PDFDocument, label: string, value: string, contentLeft: number, contentWidth: number, top: number): number => {
    const labelWidth = 155;
    const valueX = contentLeft + labelWidth;
    const rowY = top;
    const valueWidth = Math.max(180, contentWidth - labelWidth);

    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10).text(`${label}:`, contentLeft, rowY, {
        width: labelWidth - 10,
    });
    doc.fillColor('#111827').font('Helvetica').fontSize(10).text(value, valueX, rowY, {
        width: valueWidth,
    });

    const labelHeight = doc.heightOfString(`${label}:`, { width: labelWidth - 10 });
    const valueHeight = doc.heightOfString(value, { width: valueWidth });
    return rowY + Math.max(labelHeight, valueHeight) + 6;
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

        const titleText = `${getRequestTypeLabel(data.requestType)} Acknowledgement`;
        const titleTop = 118;
        const titleHeight = doc.heightOfString(titleText, { width: contentWidth, align: 'center' });
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text(titleText, contentLeft, titleTop, {
            width: contentWidth,
            align: 'center',
        });

        const subtitleTop = titleTop + titleHeight + 6;
        const subtitleText = 'Official receipt of request submission and payment confirmation.';
        const subtitleHeight = doc.heightOfString(subtitleText, { width: contentWidth, align: 'center' });
        doc.fillColor('#475569').font('Helvetica').fontSize(10).text(subtitleText, contentLeft, subtitleTop, {
            width: contentWidth,
            align: 'center',
        });

        const referenceTop = subtitleTop + subtitleHeight + 16;
        const referenceHeight = 58;
        doc.roundedRect(contentLeft, referenceTop, contentWidth, referenceHeight, 6).fill('#f1f5f9');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9).text('REFERENCE NUMBER', contentLeft + 10, referenceTop + 10, {
            width: contentWidth - 20,
        });
        doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(14).text(cleanText(data.requestId), contentLeft + 10, referenceTop + 26, {
            width: contentWidth - 20,
        });

        let cursorY = referenceTop + referenceHeight + 16;

        cursorY = drawSectionTitleAt(doc, 'Applicant Information', contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Name', cleanText(data.name) || 'N/A', contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Email', cleanText(data.email || data.companyEmail) || 'N/A', contentLeft, contentWidth, cursorY);
        if (data.usn) {
            cursorY = drawKeyValueAt(doc, 'USN / ID', cleanText(data.usn) || 'N/A', contentLeft, contentWidth, cursorY);
        }
        if (data.companyName) {
            cursorY = drawKeyValueAt(doc, 'Company', cleanText(data.companyName) || 'N/A', contentLeft, contentWidth, cursorY);
        }

        cursorY = drawSectionTitleAt(doc, 'Request Details', contentLeft, contentWidth, cursorY + 4);
        for (const [key, value] of Object.entries(data.details)) {
            cursorY = drawKeyValueAt(doc, cleanText(key), cleanText(value) || 'N/A', contentLeft, contentWidth, cursorY);
        }

        cursorY = drawSectionTitleAt(doc, 'Payment Information', contentLeft, contentWidth, cursorY + 4);
        cursorY = drawKeyValueAt(doc, 'Amount Paid', `INR ${Number(data.amount || 0).toFixed(2)}`, contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Payment Status', 'PAID', contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Payment Order ID', cleanText(data.paymentOrderId) || 'N/A', contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Submitted At', formatDate(new Date(data.createdAt)), contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Generated At', formatDate(new Date()), contentLeft, contentWidth, cursorY);

        cursorY += 10;
        const noticeHeight = 92;
        const noticeText = 'This acknowledgement confirms that your paid request has been received by the institution and queued for processing. Keep this document as proof of successful application submission.';
        const noticeBodyHeight = doc.heightOfString(noticeText, { width: contentWidth - 20, align: 'left' });
        const requiredNoticeHeight = Math.max(noticeHeight, noticeBodyHeight + 42);
        doc.roundedRect(contentLeft, cursorY, contentWidth, requiredNoticeHeight, 6).fill('#eff6ff');
        doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(10).text('IMPORTANT NOTICE', contentLeft + 10, cursorY + 10, {
            width: contentWidth - 20,
        });
        doc.fillColor('#1e3a8a').font('Helvetica').fontSize(9).text(
            noticeText,
            contentLeft + 10,
            cursorY + 28,
            { width: contentWidth - 20, align: 'left' }
        );
        cursorY += requiredNoticeHeight + 14;

        const footerY = doc.page.height - 62;
        doc.rect(0, footerY, doc.page.width, 62).fill('#f8fafc');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10).text('Global Academy of Technology', 45, footerY + 16);
        doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Electronically generated document. Signature not required.', 45, footerY + 31);
        doc.fillColor('#334155').font('Helvetica').fontSize(8).text('Authorized by: Administrator, Portal System', doc.page.width - 230, footerY + 31);

        doc.end();
    });
};
