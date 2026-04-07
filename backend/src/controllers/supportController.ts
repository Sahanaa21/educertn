import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendEmail } from '../utils/email';
import { escapeHtml } from '../utils/html';

const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export const createIssueReport = async (req: Request, res: Response): Promise<any> => {
    try {
        const {
            title,
            description,
            category,
            pageUrl,
            reportedByName,
            reportedByEmail,
            role,
            deviceInfo
        } = req.body as Record<string, string | undefined>;

        if (!title || !description || !category) {
            return res.status(400).json({ message: 'Title, description and category are required' });
        }

        if (title.trim().length < 5 || description.trim().length < 15) {
            return res.status(400).json({ message: 'Please provide a more detailed issue report' });
        }

        const issue = await (prisma as any).issueReport.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                category: category.trim(),
                pageUrl: pageUrl?.trim() || null,
                reportedByName: reportedByName?.trim() || null,
                reportedByEmail: reportedByEmail?.trim() || null,
                role: role?.trim() || null,
                deviceInfo: deviceInfo?.trim() || null,
                status: 'OPEN'
            }
        });

        // Fire-and-forget email alert so SMTP errors don't fail the request
        void (async () => {
            try {
                const settings = await (prisma as any).portalSettings.findUnique({ where: { id: 1 } });
                const notifyEmail = settings?.supportEmail || process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
                if (notifyEmail) {
                    const safeTitle = escapeHtml(issue.title);
                    const safeCategory = escapeHtml(issue.category);
                    const safeStatus = escapeHtml(issue.status);
                    const safeReportedByName = escapeHtml(issue.reportedByName || 'Anonymous');
                    const safeReportedByEmail = escapeHtml(issue.reportedByEmail || 'Email not provided');
                    const safeRole = escapeHtml(issue.role || 'Unknown');
                    const safePageUrl = escapeHtml(issue.pageUrl || 'N/A');
                    const safeDescription = escapeHtml(issue.description);
                    const html = `
                        <h2>New Issue Report Submitted</h2>
                        <p><strong>Title:</strong> ${safeTitle}</p>
                        <p><strong>Category:</strong> ${safeCategory}</p>
                        <p><strong>Status:</strong> ${safeStatus}</p>
                        <p><strong>Reported By:</strong> ${safeReportedByName} (${safeReportedByEmail})</p>
                        <p><strong>Role:</strong> ${safeRole}</p>
                        <p><strong>Page:</strong> ${safePageUrl}</p>
                        <p><strong>Description:</strong></p>
                        <p>${safeDescription}</p>
                    `;
                    await sendEmail(notifyEmail, '[GAT Portal] New Issue Report', html);
                }
            } catch (emailErr) {
                console.error('Failed to send issue report notification email:', emailErr);
            }
        })();

        return res.status(201).json(issue);
    } catch (error) {
        console.error('Error creating issue report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllIssueReports = async (_req: Request, res: Response): Promise<any> => {
    try {
        const issues = await (prisma as any).issueReport.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json(issues);
    } catch (error) {
        console.error('Error fetching issue reports:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateIssueReport = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);
        const { status, adminNotes } = req.body as { status?: string; adminNotes?: string };

        if (!status || !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
            return res.status(400).json({ message: 'Valid status is required' });
        }

        const updated = await (prisma as any).issueReport.update({
            where: { id },
            data: {
                status: status as (typeof ALLOWED_STATUSES)[number],
                adminNotes: adminNotes?.trim() || null
            }
        });

        return res.json(updated);
    } catch (error) {
        console.error('Error updating issue report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
