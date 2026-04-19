import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import { AcknowledgementData } from './acknowledgementTypes';
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

const fitText = (doc: PDFKit.PDFDocument, text: string, maxWidth: number): string => {
    const safe = cleanText(text) || 'N/A';
    if (doc.widthOfString(safe) <= maxWidth) return safe;

    let out = safe;
    while (out.length > 1 && doc.widthOfString(`${out}...`) > maxWidth) {
        out = out.slice(0, -1);
    }

    return `${out}...`;
};

const drawSectionTitleAt = (doc: PDFKit.PDFDocument, title: string, left: number, top: number): number => {
    doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(11).text(title.toUpperCase(), left, top, { underline: true });
    return top + 16;
};

const drawKeyValueAt = (
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    contentLeft: number,
    contentWidth: number,
    top: number
): number => {
    const labelWidth = 140;
    const valueWidth = contentWidth - labelWidth;
    const fittedValue = fitText(doc, value, valueWidth - 4);

    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9).text(`${label}:`, contentLeft, top, {
        width: labelWidth - 6,
        lineBreak: false,
    });
    doc.fillColor('#111827').font('Helvetica').fontSize(9).text(fittedValue, contentLeft + labelWidth, top, {
        width: valueWidth,
        lineBreak: false,
    });

    return top + 13;
};

const ensureSinglePagePdf = async (buffer: Buffer): Promise<Buffer> => {
    const source = await PDFLibDocument.load(buffer);
    if (source.getPageCount() <= 1) {
        return buffer;
    }

    const single = await PDFLibDocument.create();
    const [firstPage] = await single.copyPages(source, [0]);
    single.addPage(firstPage);

    const bytes = await single.save();
    return Buffer.from(bytes);
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
        doc.on('end', async () => {
            try {
                const raw = Buffer.concat(chunks);
                const singlePage = await ensureSinglePagePdf(raw);
                resolve(singlePage);
            } catch (error) {
                reject(error);
            }
        });
        doc.on('error', reject);

        const logoPath = getAcknowledgementLogoPath();
        const contentLeft = doc.page.margins.left;
        const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const footerY = doc.page.height - 56;
        const contentBottom = footerY - 14;

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
        const titleTop = 110;
        const titleHeight = doc.heightOfString(titleText, { width: contentWidth, align: 'center' });
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(15).text(titleText, contentLeft, titleTop, {
            width: contentWidth,
            align: 'center',
            lineBreak: true,
        });

        const subtitleTop = titleTop + titleHeight + 6;
        const subtitleText = 'Official receipt of request submission and payment confirmation.';
        const subtitleHeight = doc.heightOfString(subtitleText, { width: contentWidth, align: 'center' });
        doc.fillColor('#475569').font('Helvetica').fontSize(9).text(subtitleText, contentLeft, subtitleTop, {
            width: contentWidth,
            align: 'center',
            lineBreak: true,
        });

        const referenceTop = subtitleTop + subtitleHeight + 10;
        const referenceHeight = 42;
        doc.roundedRect(contentLeft, referenceTop, contentWidth, referenceHeight, 6).fill('#f1f5f9');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8).text('REFERENCE NUMBER', contentLeft + 10, referenceTop + 8, {
            width: contentWidth - 20,
            lineBreak: false,
        });
        doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(12).text(fitText(doc, cleanText(data.requestId), contentWidth - 20), contentLeft + 10, referenceTop + 20, {
            width: contentWidth - 20,
            lineBreak: false,
        });

        let cursorY = referenceTop + referenceHeight + 10;

        cursorY = drawSectionTitleAt(doc, 'Applicant Information', contentLeft, cursorY);
        cursorY = drawKeyValueAt(doc, 'Name', cleanText(data.name) || 'N/A', contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Email', cleanText(data.email || data.companyEmail) || 'N/A', contentLeft, contentWidth, cursorY);
        if (data.usn) {
            cursorY = drawKeyValueAt(doc, 'USN / ID', cleanText(data.usn) || 'N/A', contentLeft, contentWidth, cursorY);
        }
        if (data.companyName) {
            cursorY = drawKeyValueAt(doc, 'Company', cleanText(data.companyName) || 'N/A', contentLeft, contentWidth, cursorY);
        }

        cursorY = drawSectionTitleAt(doc, 'Request Details', contentLeft, cursorY + 2);
        for (const [key, value] of Object.entries(data.details)) {
            if (cursorY > contentBottom - 70) break;
            cursorY = drawKeyValueAt(doc, cleanText(key), cleanText(value) || 'N/A', contentLeft, contentWidth, cursorY);
        }

        cursorY = drawSectionTitleAt(doc, 'Payment Information', contentLeft, cursorY + 2);
        cursorY = drawKeyValueAt(doc, 'Amount Paid', `INR ${Number(data.amount || 0).toFixed(2)}`, contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Payment Status', 'PAID', contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Payment Order ID', cleanText(data.paymentOrderId) || 'N/A', contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Submitted At', formatDate(new Date(data.createdAt)), contentLeft, contentWidth, cursorY);
        cursorY = drawKeyValueAt(doc, 'Generated At', formatDate(new Date()), contentLeft, contentWidth, cursorY);

        cursorY += 6;
        const noticeHeight = 56;
        const noticeText = 'This acknowledgement confirms that your paid request has been received by the institution and queued for processing. Keep this document as proof of successful application submission.';
        const availableForNotice = Math.max(40, contentBottom - cursorY);
        const requiredNoticeHeight = Math.min(noticeHeight, availableForNotice);
        doc.roundedRect(contentLeft, cursorY, contentWidth, requiredNoticeHeight, 6).fill('#eff6ff');
        doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(9).text('IMPORTANT NOTICE', contentLeft + 10, cursorY + 8, {
            width: contentWidth - 20,
            lineBreak: false,
        });
        doc.fillColor('#1e3a8a').font('Helvetica').fontSize(8).text(fitText(doc, noticeText, contentWidth - 20), contentLeft + 10, cursorY + 22, {
            width: contentWidth - 20,
            lineBreak: false,
        });

        doc.rect(0, footerY, doc.page.width, 62).fill('#f8fafc');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9).text('Global Academy of Technology', 45, footerY + 14);
        doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Electronically generated document. Signature not required.', 45, footerY + 28);
        doc.fillColor('#334155').font('Helvetica').fontSize(8).text('Authorized by: Administrator, Portal System', doc.page.width - 230, footerY + 28);

        doc.end();
    });
};
