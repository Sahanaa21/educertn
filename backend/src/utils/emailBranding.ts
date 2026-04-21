import { escapeHtml } from './html';

export const buildEmailBrandHeader = (title: string, subtitle: string): string => {
    const safeTitle = escapeHtml(title);
    const safeSubtitle = escapeHtml(subtitle);

    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1e3a8a;">
            <tr>
                <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td width="70" valign="middle" style="width:70px;padding-right:8px;">
                                <img src="cid:gat-logo" alt="Global Academy of Technology logo" width="56" height="56" style="width:56px;height:56px;display:block;border:0;outline:none;text-decoration:none;" />
                            </td>
                            <td valign="middle" style="font-family:Arial,sans-serif;">
                                <div style="color:#ffffff;font-size:22px;font-weight:700;line-height:1.25;">${safeTitle}</div>
                                <div style="color:#dbeafe;font-size:12px;line-height:1.45;padding-top:4px;">${safeSubtitle}</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;
};

export const buildEmailBrandShell = (title: string, subtitle: string, bodyHtml: string): string => {
    const safeTitle = escapeHtml(title);
    const safeSubtitle = escapeHtml(subtitle);

    return `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
    <div style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safeTitle} - ${safeSubtitle}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:0;margin:0;">
        <tr>
            <td align="center" style="padding:20px 12px;">
                <table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #e5e7eb;border-collapse:separate;border-radius:8px;overflow:hidden;">
                    <tr>
                        <td>
                            ${buildEmailBrandHeader(title, subtitle)}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 24px 28px;font-family:Arial,sans-serif;color:#111827;line-height:1.65;font-size:14px;word-break:break-word;">
                            ${bodyHtml}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 24px 20px;font-family:Arial,sans-serif;font-size:11px;color:#6b7280;line-height:1.5;">
                            This is an automated email from Global Academy of Technology. For support, please contact the portal helpdesk.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};
