import { getAcknowledgementLogoDataUri } from './acknowledgementAssets';
import { escapeHtml } from './html';

export const buildEmailBrandHeader = (title: string, subtitle: string): string => {
    const logoDataUri = getAcknowledgementLogoDataUri();
    const safeTitle = escapeHtml(title);
    const safeSubtitle = escapeHtml(subtitle);

    return `
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 28px 24px; text-align: center; border-radius: 14px 14px 0 0;">
            ${logoDataUri ? `<img src="${logoDataUri}" alt="Global Academy of Technology logo" style="width: 76px; height: 76px; object-fit: contain; display: block; margin: 0 auto 12px; background: rgba(255,255,255,0.12); padding: 6px; border-radius: 999px;" />` : ''}
            <div style="color: #ffffff; font-family: Arial, sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 0.3px;">${safeTitle}</div>
            <div style="color: #dbeafe; font-family: Arial, sans-serif; font-size: 12px; margin-top: 6px; font-weight: 400;">${safeSubtitle}</div>
        </div>
    `;
};

export const buildEmailBrandShell = (title: string, subtitle: string, bodyHtml: string): string => {
    return `
        <div style="background: #f3f4f6; padding: 20px;">
            <div style="max-width: 760px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);">
                ${buildEmailBrandHeader(title, subtitle)}
                <div style="padding: 26px 28px 30px; font-family: Arial, sans-serif; color: #111827; line-height: 1.7; font-size: 14px;">
                    ${bodyHtml}
                </div>
            </div>
        </div>
    `;
};
