import { escapeHtml } from './html';

export interface AcknowledgementData {
    requestId: string;
    requestType: 'CERTIFICATE' | 'VERIFICATION' | 'ACADEMIC_SERVICE';
    name: string;
    usn?: string;
    email?: string;
    companyName?: string;
    companyEmail?: string;
    details: Record<string, string>;
    amount: number;
    paymentOrderId: string;
    createdAt: Date;
}

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

const getRequestTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
        'CERTIFICATE': 'Certificate Request',
        'VERIFICATION': 'Verification Request',
        'ACADEMIC_SERVICE': 'Academic Service Request'
    };
    return typeMap[type] || 'Request';
};

export const generateAcknowledgementHtml = (data: AcknowledgementData): string => {
    const safeRequestId = escapeHtml(data.requestId);
    const safeName = escapeHtml(data.name);
    const safeUsn = escapeHtml(data.usn || 'N/A');
    const safeEmail = escapeHtml(data.email || data.companyEmail || 'N/A');
    const safeCompanyName = escapeHtml(data.companyName || 'N/A');
    const safePaymentOrderId = escapeHtml(data.paymentOrderId);
    const requestTypeLabel = getRequestTypeLabel(data.requestType);

    const detailsHtml = Object.entries(data.details)
        .map(([key, value]) => `
            <tr>
                <td class="detail-label">${escapeHtml(key)}</td>
                <td class="detail-value">${escapeHtml(value)}</td>
            </tr>
        `)
        .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeRequestId} - Acknowledgement</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            border-bottom: 5px solid #1e3a8a;
        }
        .logo-area {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        .org-name {
            font-size: 14px;
            opacity: 0.95;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
        }
        .title-section {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1e3a8a;
            margin-bottom: 5px;
        }
        .subtitle {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .reference-number {
            background-color: #f3f4f6;
            padding: 15px;
            border-left: 4px solid #3b82f6;
            margin: 20px 0;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }
        .reference-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .reference-value {
            font-size: 18px;
            font-weight: bold;
            color: #1e3a8a;
        }
        .info-section {
            margin: 25px 0;
        }
        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #1e3a8a;
            text-transform: uppercase;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #d1d5db;
        }
        .detail-table {
            width: 100%;
            border-collapse: collapse;
        }
        .detail-table tr {
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-table tr:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
            padding: 12px 0;
            width: 35%;
            vertical-align: top;
            font-size: 13px;
        }
        .detail-value {
            padding: 12px 0;
            padding-left: 20px;
            color: #1f2937;
            font-size: 13px;
        }
        .status-badge {
            display: inline-block;
            background-color: #dcfce7;
            color: #166534;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 12px;
            border: 1px solid #86efac;
        }
        .note-box {
            background-color: #eff6ff;
            border-left: 4px solid #0284c7;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
            font-size: 12px;
            line-height: 1.6;
            color: #1e40af;
        }
        .note-icon {
            font-weight: bold;
            margin-right: 8px;
        }
        .footer {
            background-color: #f9fafb;
            padding: 25px 30px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #6b7280;
            line-height: 1.8;
        }
        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
        }
        .footer-left {
            flex: 1;
        }
        .footer-right {
            text-align: right;
            flex: 1;
        }
        .signature-line {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #d1d5db;
        }
        .signature-text {
            font-size: 12px;
            color: #374151;
        }
        .generated-info {
            margin-top: 15px;
            font-size: 10px;
            color: #9ca3af;
        }
        .highlight-row {
            background-color: #f0f9ff;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-area">🎓 GAT</div>
            <div class="org-name">Global Academy of Technology</div>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Title Section -->
            <div class="title-section">
                <div class="title">${requestTypeLabel} Acknowledgement</div>
                <div class="subtitle">Official Receipt of Request</div>
            </div>

            <!-- Reference Number -->
            <div class="reference-number">
                <div class="reference-label">Reference Number</div>
                <div class="reference-value">${safeRequestId}</div>
            </div>

            <!-- Applicant Information -->
            <div class="info-section">
                <div class="section-title">Applicant Information</div>
                <table class="detail-table">
                    <tr>
                        <td class="detail-label">Name</td>
                        <td class="detail-value">${safeName}</td>
                    </tr>
                    <tr>
                        <td class="detail-label">Email</td>
                        <td class="detail-value">${safeEmail}</td>
                    </tr>
                    ${data.usn ? `
                    <tr>
                        <td class="detail-label">USN/ID</td>
                        <td class="detail-value">${safeUsn}</td>
                    </tr>
                    ` : ''}
                    ${data.companyName ? `
                    <tr>
                        <td class="detail-label">Company</td>
                        <td class="detail-value">${safeCompanyName}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            <!-- Request Details -->
            <div class="info-section">
                <div class="section-title">Request Details</div>
                <table class="detail-table">
                    ${detailsHtml}
                </table>
            </div>

            <!-- Payment Information -->
            <div class="info-section">
                <div class="section-title">Payment Information</div>
                <table class="detail-table">
                    <tr class="highlight-row">
                        <td class="detail-label">Amount Paid</td>
                        <td class="detail-value"><strong>₹ ${Number(data.amount).toFixed(2)}</strong></td>
                    </tr>
                    <tr class="highlight-row">
                        <td class="detail-label">Payment Status</td>
                        <td class="detail-value"><span class="status-badge">✓ PAID</span></td>
                    </tr>
                    <tr>
                        <td class="detail-label">Payment Order ID</td>
                        <td class="detail-value">${safePaymentOrderId}</td>
                    </tr>
                    <tr>
                        <td class="detail-label">Submission Date & Time</td>
                        <td class="detail-value">${formatDate(data.createdAt)}</td>
                    </tr>
                </table>
            </div>

            <!-- Important Note -->
            <div class="note-box">
                <span class="note-icon">ℹ️</span>
                <strong>Important:</strong> This acknowledgement confirms receipt of your paid request. Your request has been successfully registered in our system and is queued for processing. Please keep this document as proof of your application submission. Your request will be processed in accordance with the stated timeline.
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <div class="footer-left">
                    <div><strong>Global Academy of Technology</strong></div>
                    <div>Academic & Student Services Division</div>
                    <div style="margin-top: 8px; font-size: 10px; color: #9ca3af;">
                        Generated: ${formatDate(new Date())}
                    </div>
                </div>
                <div class="footer-right">
                    <div class="signature-text">
                        <div style="margin-bottom: 20px;">Authorized by</div>
                        <div class="signature-line">
                            ________________________<br>
                            Administrator<br>
                            Portal System
                        </div>
                    </div>
                </div>
            </div>
            <div class="generated-info">
                This is an electronically generated document. No signature is required. For assistance, contact support@gat.ac.in
            </div>
        </div>
    </div>
</body>
</html>`;
};
