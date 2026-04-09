"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIssueReportFromEmail = exports.updateIssueReport = exports.getAllIssueReports = exports.createIssueReport = void 0;
const crypto_1 = require("crypto");
const prisma_1 = require("../config/prisma");
const email_1 = require("../utils/email");
const html_1 = require("../utils/html");
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const DEVELOPER_ISSUE_EMAIL = 'sahanaa2060@gmail.com';
const EMAIL_ACTION_STATUSES = ['IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const ISSUE_MAIL_ACTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ISSUE_MAIL_ACTION_SECRET = String(process.env.ISSUE_MAIL_ACTION_SECRET || process.env.JWT_SECRET || '').trim();
const CRITICAL_ESCALATION_EMAILS = Array.from(new Set([
    DEVELOPER_ISSUE_EMAIL,
    ...String(process.env.CRITICAL_ISSUE_EMAILS || '')
        .split(/[,;\n]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
]));
    const toBase64Url = (value) => Buffer.from(value, 'utf8').toString('base64url');
    const fromBase64Url = (value) => Buffer.from(value, 'base64url').toString('utf8');
    const signMailActionPayload = (payloadBase64) => {
        if (!ISSUE_MAIL_ACTION_SECRET)
            return '';
        return (0, crypto_1.createHmac)('sha256', ISSUE_MAIL_ACTION_SECRET).update(payloadBase64).digest('hex');
    };
    const buildMailActionToken = (issueId, status) => {
        if (!ISSUE_MAIL_ACTION_SECRET)
            return null;
        const payload = {
            issueId,
            status,
            exp: Date.now() + ISSUE_MAIL_ACTION_TTL_MS,
        };
        const payloadBase64 = toBase64Url(JSON.stringify(payload));
        const signature = signMailActionPayload(payloadBase64);
        return `${payloadBase64}.${signature}`;
    };
    const validateMailActionToken = (token, issueId, status) => {
        if (!ISSUE_MAIL_ACTION_SECRET || !token || !issueId || !status)
            return false;
        const parts = token.split('.');
        if (parts.length !== 2)
            return false;
        const [payloadBase64, signatureHex] = parts;
        const expectedSignature = signMailActionPayload(payloadBase64);
        const sigBuffer = Buffer.from(signatureHex, 'hex');
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');
        if (sigBuffer.length !== expectedBuffer.length)
            return false;
        if (!(0, crypto_1.timingSafeEqual)(sigBuffer, expectedBuffer))
            return false;
        try {
            const payload = JSON.parse(fromBase64Url(payloadBase64));
            if (payload.issueId !== issueId)
                return false;
            if (payload.status !== status)
                return false;
            if (Date.now() > Number(payload.exp || 0))
                return false;
            return true;
        }
        catch (_a) {
            return false;
        }
    };
const analyzeIssue = (input) => {
    const text = `${input.title} ${input.description} ${input.category} ${(input.pageUrl || '')}`.toLowerCase();
    let score = 0;
    const tags = new Set();
    const includeIfMatch = (regex, tag, points) => {
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
    if (input.category.toLowerCase().includes('payment'))
        score += 2;
    if (input.category.toLowerCase().includes('login'))
        score += 2;
    let priority = 'LOW';
    if (score >= 8)
        priority = 'CRITICAL';
    else if (score >= 5)
        priority = 'HIGH';
    else if (score >= 3)
        priority = 'MEDIUM';
    return {
        priority,
        tags: Array.from(tags),
    };
};
const toTokens = (value) => {
    return new Set(value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2));
};
const jaccardSimilarity = (a, b) => {
    const aTokens = toTokens(a);
    const bTokens = toTokens(b);
    if (aTokens.size === 0 && bTokens.size === 0)
        return 1;
    if (aTokens.size === 0 || bTokens.size === 0)
        return 0;
    let intersection = 0;
    for (const token of aTokens) {
        if (bTokens.has(token))
            intersection += 1;
    }
    const union = new Set([...aTokens, ...bTokens]).size;
    return union === 0 ? 0 : intersection / union;
};
const detectDuplicateIssue = (input) => __awaiter(void 0, void 0, void 0, function* () {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const candidates = yield prisma_1.prisma.issueReport.findMany({
        where: Object.assign({ category: input.category, status: { in: ['OPEN', 'IN_PROGRESS'] }, createdAt: { gte: thirtyDaysAgo } }, (input.id ? { id: { not: input.id } } : {})),
        orderBy: { createdAt: 'desc' },
        take: 75
    });
    for (const candidate of candidates) {
        const titleScore = jaccardSimilarity(input.title, candidate.title);
        const descriptionScore = jaccardSimilarity(input.description, candidate.description);
        const samePage = Boolean(input.pageUrl && candidate.pageUrl && input.pageUrl === candidate.pageUrl);
        const probableDuplicate = titleScore >= 0.7 && (descriptionScore >= 0.45 || samePage);
        if (probableDuplicate) {
            return candidate.id;
        }
    }
    return null;
});
const extractLastMailActionUpdatedAt = (adminNotes) => {
    const notes = String(adminNotes || '');
    const regex = /\[Mail Action\]\s+Status set to\s+[A-Z_]+\s+at\s+([^\n\r]+)/g;
    let match = null;
    let lastTimestamp = null;
    while ((match = regex.exec(notes)) !== null) {
        lastTimestamp = String(match[1] || '').trim();
    }
    if (!lastTimestamp)
        return null;
    const parsed = new Date(lastTimestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const createIssueReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, category, pageUrl, reportedByName, reportedByEmail, role, deviceInfo } = req.body;
        if (!title || !description || !category) {
            return res.status(400).json({ message: 'Title, description and category are required' });
        }
        if (title.trim().length < 5 || description.trim().length < 15) {
            return res.status(400).json({ message: 'Please provide a more detailed issue report' });
        }
        const duplicateOfId = yield detectDuplicateIssue({
            title: title.trim(),
            description: description.trim(),
            category: category.trim(),
            pageUrl: (pageUrl === null || pageUrl === void 0 ? void 0 : pageUrl.trim()) || null,
        });
        const issue = yield prisma_1.prisma.issueReport.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                category: category.trim(),
                pageUrl: (pageUrl === null || pageUrl === void 0 ? void 0 : pageUrl.trim()) || null,
                reportedByName: (reportedByName === null || reportedByName === void 0 ? void 0 : reportedByName.trim()) || null,
                reportedByEmail: (reportedByEmail === null || reportedByEmail === void 0 ? void 0 : reportedByEmail.trim()) || null,
                role: (role === null || role === void 0 ? void 0 : role.trim()) || null,
                deviceInfo: (deviceInfo === null || deviceInfo === void 0 ? void 0 : deviceInfo.trim()) || null,
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
        void (() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const notifyEmail = DEVELOPER_ISSUE_EMAIL;
                if (notifyEmail) {
                    const safeTitle = (0, html_1.escapeHtml)(issue.title);
                    const safeCategory = (0, html_1.escapeHtml)(issue.category);
                    const safeStatus = (0, html_1.escapeHtml)(issue.status);
                    const safeReportedByName = (0, html_1.escapeHtml)(issue.reportedByName || 'Anonymous');
                    const safeReportedByEmail = (0, html_1.escapeHtml)(issue.reportedByEmail || 'Email not provided');
                    const safeRole = (0, html_1.escapeHtml)(issue.role || 'Unknown');
                    const safePageUrl = (0, html_1.escapeHtml)(issue.pageUrl || 'N/A');
                    const safeDescription = (0, html_1.escapeHtml)(issue.description);
                    const safePriority = classification.priority;
                    const safeTags = classification.tags.join(', ') || 'none';
                    const safeDuplicate = duplicateOfId || 'No likely duplicate found';
                    const backendPublicUrl = String(process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
                    const actionLinks = EMAIL_ACTION_STATUSES.map((nextStatus) => {
                        const token = buildMailActionToken(issue.id, nextStatus);
                        if (!token)
                            return null;
                        const url = `${backendPublicUrl}/api/support/issues/${encodeURIComponent(issue.id)}/mail-action?action=${encodeURIComponent(nextStatus)}&token=${encodeURIComponent(token)}`;
                        return {
                            status: nextStatus,
                            url,
                        };
                    }).filter(Boolean);
                    const actionButtonsHtml = actionLinks.length > 0
                        ? `<p><strong>Quick Actions:</strong></p><div>${actionLinks.map((item) => `<a href="${item.url}" style="display:inline-block;margin-right:8px;margin-bottom:8px;padding:8px 12px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;">Mark ${item.status.replace('_', ' ')}</a>`).join('')}</div><p style="font-size:12px;color:#475569;">Secure links expire in 7 days.</p>`
                        : '<p style="font-size:12px;color:#b45309;"><strong>Note:</strong> Set ISSUE_MAIL_ACTION_SECRET to enable secure status action links in email.</p>';
                    const html = `
                        <h2>New Issue Report Submitted</h2>
                        <p><strong>Priority:</strong> ${safePriority}</p>
                        <p><strong>Auto Tags:</strong> ${safeTags}</p>
                        <p><strong>Possible Duplicate Of:</strong> ${safeDuplicate}</p>
                        <p><strong>Title:</strong> ${safeTitle}</p>
                        <p><strong>Category:</strong> ${safeCategory}</p>
                        <p><strong>Status:</strong> ${safeStatus}</p>
                        <p><strong>Reported By:</strong> ${safeReportedByName} (${safeReportedByEmail})</p>
                        <p><strong>Role:</strong> ${safeRole}</p>
                        <p><strong>Page:</strong> ${safePageUrl}</p>
                        ${actionButtonsHtml}
                        <p><strong>Description:</strong></p>
                        <p>${safeDescription}</p>
                    `;
                    yield (0, email_1.sendEmail)(notifyEmail, `[GAT Portal] ${classification.priority} Issue Report`, html);
                    const shouldEscalate = classification.priority === 'HIGH' || classification.priority === 'CRITICAL';
                    if (shouldEscalate) {
                        const escalationHtml = `
                            <h2>Escalation: ${safePriority} Issue</h2>
                            <p><strong>Issue ID:</strong> ${issue.id}</p>
                            <p><strong>Title:</strong> ${issue.title}</p>
                            <p><strong>Category:</strong> ${issue.category}</p>
                            <p><strong>Page:</strong> ${issue.pageUrl || 'N/A'}</p>
                            <p><strong>Reporter:</strong> ${issue.reportedByName || 'Anonymous'} (${issue.reportedByEmail || 'Email not provided'})</p>
                            <p><strong>Possible Duplicate Of:</strong> ${safeDuplicate}</p>
                            <p><strong>Description:</strong> ${issue.description}</p>
                        `;
                        yield Promise.all(CRITICAL_ESCALATION_EMAILS.map((email) => (0, email_1.sendEmail)(email, `[GAT Portal][Escalation] ${classification.priority} issue needs attention`, escalationHtml)));
                    }
                }
            }
            catch (emailErr) {
                console.error('Failed to send issue report notification email:', emailErr);
            }
        }))();
        return res.status(201).json(Object.assign(Object.assign({}, issue), { priority: classification.priority, tags: classification.tags, duplicateOfId, mailActionUpdatedAt: extractLastMailActionUpdatedAt(issue.adminNotes) }));
    }
    catch (error) {
        console.error('Error creating issue report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createIssueReport = createIssueReport;
const getAllIssueReports = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const issues = yield prisma_1.prisma.issueReport.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json(yield Promise.all(issues.map((issue) => __awaiter(void 0, void 0, void 0, function* () {
            const classification = analyzeIssue({
                title: issue.title,
                description: issue.description,
                category: issue.category,
                pageUrl: issue.pageUrl
            });
            const duplicateOfId = yield detectDuplicateIssue({
                id: issue.id,
                title: issue.title,
                description: issue.description,
                category: issue.category,
                pageUrl: issue.pageUrl,
            });
            return Object.assign(Object.assign({}, issue), { priority: classification.priority, tags: classification.tags, duplicateOfId, mailActionUpdatedAt: extractLastMailActionUpdatedAt(issue.adminNotes) });
        }))));
    }
    catch (error) {
        console.error('Error fetching issue reports:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllIssueReports = getAllIssueReports;
const updateIssueReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = String(req.params.id);
        const { status, adminNotes } = req.body;
        if (!status || !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Valid status is required' });
        }
        const updated = yield prisma_1.prisma.issueReport.update({
            where: { id },
            data: {
                status: status,
                adminNotes: (adminNotes === null || adminNotes === void 0 ? void 0 : adminNotes.trim()) || null
            }
        });
        return res.json(updated);
    }
    catch (error) {
        console.error('Error updating issue report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateIssueReport = updateIssueReport;
const updateIssueReportFromEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const issueId = String(req.params.id || '').trim();
        const action = String(req.query.action || '').trim().toUpperCase();
        const token = String(req.query.token || '').trim();
        if (!ISSUE_MAIL_ACTION_SECRET) {
            return res.status(503).send('<h2>Mail actions are not configured</h2><p>Please set ISSUE_MAIL_ACTION_SECRET and retry.</p>');
        }
        if (!issueId || !action || !token) {
            return res.status(400).send('<h2>Invalid mail action link</h2><p>Required parameters are missing.</p>');
        }
        if (!EMAIL_ACTION_STATUSES.includes(action)) {
            return res.status(400).send('<h2>Invalid mail action</h2><p>Only IN_PROGRESS, RESOLVED, and CLOSED are allowed via mail.</p>');
        }
        const valid = validateMailActionToken(token, issueId, action);
        if (!valid) {
            return res.status(401).send('<h2>Mail action link expired or invalid</h2><p>Please use the latest email link.</p>');
        }
        const existing = yield prisma_1.prisma.issueReport.findUnique({ where: { id: issueId } });
        if (!existing) {
            return res.status(404).send('<h2>Issue not found</h2><p>This issue may have been deleted.</p>');
        }
        if (existing.status !== action) {
            yield prisma_1.prisma.issueReport.update({
                where: { id: issueId },
                data: {
                    status: action,
                    adminNotes: `${existing.adminNotes ? `${existing.adminNotes}\n` : ''}[Mail Action] Status set to ${action} at ${new Date().toISOString()}`
                }
            });
        }
        return res.status(200).send(`
            <h2>Issue status updated</h2>
            <p><strong>Issue ID:</strong> ${(0, html_1.escapeHtml)(issueId)}</p>
            <p><strong>New Status:</strong> ${(0, html_1.escapeHtml)(action)}</p>
            <p>You can close this tab now.</p>
        `);
    }
    catch (error) {
        console.error('Error updating issue from mail action:', error);
        return res.status(500).send('<h2>Failed to update issue status</h2><p>Please try again from a fresh email link.</p>');
    }
});
exports.updateIssueReportFromEmail = updateIssueReportFromEmail;
