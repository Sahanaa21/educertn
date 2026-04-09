import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendEmail } from '../utils/email';
import { escapeHtml } from '../utils/html';

const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const DEVELOPER_ISSUE_EMAIL = 'sahanaa2060@gmail.com';
type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const analyzeIssue = (input: { title: string; description: string; category: string; pageUrl?: string | null; }) => {
    const text = `${input.title} ${input.description} ${input.category} ${input.pageUrl || ''}`.toLowerCase();
    let score = 0;
    const tags = new Set<string>();

    const includeIfMatch = (regex: RegExp, tag: string, points: number) => {
        if (regex.test(text)) {
            tags.add(tag);
            score += points;
        }
    };

    includeIfMatch(/payment|upi|transaction|checkout|failed payment|refund|gateway/, 'payment', 3);
    includeIfMatch(/login|otp|signin|auth|password|session/, 'auth', 3);
    includeIfMatch(/verify|verification|certificate/, 'verification', 2);
    includeIfMatch(/slow|lag|timeout|stuck|loading/, 'performance', 2);
    includeIfMatch(/error|exception|crash|500|stack/i, 'backend-error', 2);
    includeIfMatch(/ui|display|layout|alignment|mobile|responsive/, 'ui', 1);
    includeIfMatch(/security|unauthorized|hacked|breach|exposed|token/, 'security', 5);
    includeIfMatch(/data loss|missing data|deleted|corrupt/, 'data-loss', 5);

    if (input.category.toLowerCase().includes('payment')) score += 2;
    if (input.category.toLowerCase().includes('login')) score += 2;

    let priority: IssuePriority = 'LOW';
    if (score >= 8) priority = 'CRITICAL';
    else if (score >= 5) priority = 'HIGH';
    else if (score >= 3) priority = 'MEDIUM';

    return {
        priority,
        tags: Array.from(tags),
    };
};

const toTokens = (value: string) => {
    return new Set(
        value
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 2)
    );
};

const jaccardSimilarity = (a: string, b: string) => {
    const aTokens = toTokens(a);
    const bTokens = toTokens(b);
    if (aTokens.size === 0 && bTokens.size === 0) return 1;
    if (aTokens.size === 0 || bTokens.size === 0) return 0;

    let intersection = 0;
    for (const token of aTokens) {
        if (bTokens.has(token)) intersection += 1;
    }
    const union = new Set([...aTokens, ...bTokens]).size;
    return union === 0 ? 0 : intersection / union;
};

const detectDuplicateIssue = async (input: { id?: string; title: string; description: string; category: string; pageUrl?: string | null; }) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const candidates = await (prisma as any).issueReport.findMany({
        where: {
            category: input.category,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            createdAt: { gte: thirtyDaysAgo },
            ...(input.id ? { id: { not: input.id } } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 75
    });

    for (const candidate of candidates) {
        const titleScore = jaccardSimilarity(input.title, candidate.title);
        const descriptionScore = jaccardSimilarity(input.description, candidate.description);
        const samePage = Boolean(input.pageUrl && candidate.pageUrl && input.pageUrl === candidate.pageUrl);
        const probableDuplicate = titleScore >= 0.7 && (descriptionScore >= 0.45 || samePage);

        if (probableDuplicate) {
            return candidate.id as string;
        }
    }

    return null;
};

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

        const duplicateOfId = await detectDuplicateIssue({
            title: title.trim(),
            description: description.trim(),
            category: category.trim(),
            pageUrl: pageUrl?.trim() || null,
        });

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
        const classification = analyzeIssue({
            title: issue.title,
            description: issue.description,
            category: issue.category,
            pageUrl: issue.pageUrl
        });

        // Fire-and-forget email alert so SMTP errors don't fail the request
        void (async () => {
            try {
                const notifyEmail = DEVELOPER_ISSUE_EMAIL;
                if (notifyEmail) {
                    const safeTitle = escapeHtml(issue.title);
                    const safeCategory = escapeHtml(issue.category);
                    const safeStatus = escapeHtml(issue.status);
                    const safeReportedByName = escapeHtml(issue.reportedByName || 'Anonymous');
                    const safeReportedByEmail = escapeHtml(issue.reportedByEmail || 'Email not provided');
                    const safeRole = escapeHtml(issue.role || 'Unknown');
                    const safePageUrl = escapeHtml(issue.pageUrl || 'N/A');
                    const safeDescription = escapeHtml(issue.description);
                    const safePriority = escapeHtml(classification.priority);
                    const safeTags = escapeHtml(classification.tags.join(', ') || 'none');
                    const safeDuplicate = escapeHtml(duplicateOfId || 'No likely duplicate found');
                    const html = `
                        <h2>New Issue Report Submitted</h2>
                        <p><strong>Title:</strong> ${safeTitle}</p>
                        <p><strong>Priority:</strong> ${safePriority}</p>
                        <p><strong>Auto Tags:</strong> ${safeTags}</p>
                        <p><strong>Possible Duplicate Of:</strong> ${safeDuplicate}</p>
                        <p><strong>Category:</strong> ${safeCategory}</p>
                        <p><strong>Status:</strong> ${safeStatus}</p>
                        <p><strong>Reported By:</strong> ${safeReportedByName} (${safeReportedByEmail})</p>
                        <p><strong>Role:</strong> ${safeRole}</p>
                        <p><strong>Page:</strong> ${safePageUrl}</p>
                        <p><strong>Description:</strong></p>
                        <p>${safeDescription}</p>
                    `;
                    await sendEmail(notifyEmail, `[GAT Portal] ${classification.priority} Issue Report`, html);
                }
            } catch (emailErr) {
                console.error('Failed to send issue report notification email:', emailErr);
            }
        })();

        return res.status(201).json({
            ...issue,
            priority: classification.priority,
            tags: classification.tags,
            duplicateOfId,
        });
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
        return res.json(await Promise.all(issues.map(async (issue: any) => {
            const classification = analyzeIssue({
                title: issue.title,
                description: issue.description,
                category: issue.category,
                pageUrl: issue.pageUrl
            });
            const duplicateOfId = await detectDuplicateIssue({
                id: issue.id,
                title: issue.title,
                description: issue.description,
                category: issue.category,
                pageUrl: issue.pageUrl,
            });
            return {
                ...issue,
                priority: classification.priority,
                tags: classification.tags,
                duplicateOfId,
            };
        })));
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
