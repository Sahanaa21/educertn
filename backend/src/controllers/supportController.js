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
exports.updateIssueReport = exports.getAllIssueReports = exports.createIssueReport = void 0;
const prisma_1 = require("../config/prisma");
const email_1 = require("../utils/email");
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const DEVELOPER_ISSUE_EMAIL = 'sahanaa2060@gmail.com';
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
const createIssueReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, category, pageUrl, reportedByName, reportedByEmail, role, deviceInfo } = req.body;
        if (!title || !description || !category) {
            return res.status(400).json({ message: 'Title, description and category are required' });
        }
        if (title.trim().length < 5 || description.trim().length < 15) {
            return res.status(400).json({ message: 'Please provide a more detailed issue report' });
        }
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
                    const safePriority = classification.priority;
                    const safeTags = classification.tags.join(', ') || 'none';
                    const html = `
                        <h2>New Issue Report Submitted</h2>
                        <p><strong>Priority:</strong> ${safePriority}</p>
                        <p><strong>Auto Tags:</strong> ${safeTags}</p>
                        <p><strong>Title:</strong> ${issue.title}</p>
                        <p><strong>Category:</strong> ${issue.category}</p>
                        <p><strong>Status:</strong> ${issue.status}</p>
                        <p><strong>Reported By:</strong> ${issue.reportedByName || 'Anonymous'} (${issue.reportedByEmail || 'Email not provided'})</p>
                        <p><strong>Role:</strong> ${issue.role || 'Unknown'}</p>
                        <p><strong>Page:</strong> ${issue.pageUrl || 'N/A'}</p>
                        <p><strong>Description:</strong></p>
                        <p>${issue.description}</p>
                    `;
                    yield (0, email_1.sendEmail)(notifyEmail, `[GAT Portal] ${classification.priority} Issue Report`, html);
                }
            }
            catch (emailErr) {
                console.error('Failed to send issue report notification email:', emailErr);
            }
        }))();
        return res.status(201).json(Object.assign(Object.assign({}, issue), { priority: classification.priority, tags: classification.tags }));
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
        return res.json(issues.map((issue) => {
            const classification = analyzeIssue({
                title: issue.title,
                description: issue.description,
                category: issue.category,
                pageUrl: issue.pageUrl
            });
            return Object.assign(Object.assign({}, issue), { priority: classification.priority, tags: classification.tags });
        }));
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
