import { getAcknowledgementLogoDataUri } from './acknowledgementAssets';
import { escapeHtml } from './html';

export const buildEmailBrandHeader = (title: string, subtitle: string): string => {
    const logoDataUri = getAcknowledgementLogoDataUri();
    const safeTitle = escapeHtml(title);
    const safeSubtitle = escapeHtml(subtitle);

    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1e3a8a;">
            <tr>
                <td align="center" style="padding:24px 20px 18px;">
                    ${logoDataUri ? `<img src="${logoDataUri}" alt="Global Academy of Technology logo" width="64" height="64" style="width:64px;height:64px;display:block;border:0;outline:none;text-decoration:none;margin:0 auto 10px;" />` : ''}
                    <div style="color:#ffffff;font-family:Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;">${safeTitle}</div>
                    <div style="color:#dbeafe;font-family:Arial,sans-serif;font-size:12px;line-height:1.4;padding-top:6px;">${safeSubtitle}</div>
                </td>
            </tr>
        </table>
    `;
};

export const buildEmailBrandShell = (title: string, subtitle: string, bodyHtml: string): string => {
    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:0;margin:0;">
            <tr>
                <td align="center" style="padding:20px 12px;">
                    <table role="presentation" width="760" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:760px;background:#ffffff;border:1px solid #e5e7eb;">
                        <tr>
                            <td>
                                ${buildEmailBrandHeader(title, subtitle)}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:24px 24px 28px;font-family:Arial,sans-serif;color:#111827;line-height:1.7;font-size:14px;">
                                ${bodyHtml}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;
};
