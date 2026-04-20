import { escapeHtml } from './html';

export const buildEmailBrandHeader = (title: string, subtitle: string): string => {
    const safeTitle = escapeHtml(title);
    const safeSubtitle = escapeHtml(subtitle);

    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1e3a8a;">
            <tr>
                <td align="center" style="padding:20px 20px 16px;">
                    <img src="cid:gat-logo" alt="Global Academy of Technology logo" width="58" height="58" style="width:58px;height:58px;display:block;border:0;outline:none;text-decoration:none;margin:0 auto 10px;" />
                    <div style="color:#ffffff;font-family:Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;">${safeTitle}</div>
                    <div style="color:#dbeafe;font-family:Arial,sans-serif;font-size:12px;line-height:1.4;padding-top:6px;">${safeSubtitle}</div>
                </td>
            </tr>
        </table>
    `;
};

export const buildEmailBrandShell = (title: string, subtitle: string, bodyHtml: string): string => {
    return `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:0;margin:0;">
        <tr>
            <td align="center" style="padding:20px 12px;">
                <table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #e5e7eb;border-collapse:separate;">
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
</body>
</html>
    `;
};
