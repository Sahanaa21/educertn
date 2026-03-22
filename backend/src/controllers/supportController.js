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
        // Fire-and-forget email alert so SMTP errors don't fail the request
        void (() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const settings = yield prisma_1.prisma.portalSettings.findUnique({ where: { id: 1 } });
                const notifyEmail = (settings === null || settings === void 0 ? void 0 : settings.supportEmail) || process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
                if (notifyEmail) {
                    const html = `
                        <h2>New Issue Report Submitted</h2>
                        <p><strong>Title:</strong> ${issue.title}</p>
                        <p><strong>Category:</strong> ${issue.category}</p>
                        <p><strong>Status:</strong> ${issue.status}</p>
                        <p><strong>Reported By:</strong> ${issue.reportedByName || 'Anonymous'} (${issue.reportedByEmail || 'Email not provided'})</p>
                        <p><strong>Role:</strong> ${issue.role || 'Unknown'}</p>
                        <p><strong>Page:</strong> ${issue.pageUrl || 'N/A'}</p>
                        <p><strong>Description:</strong></p>
                        <p>${issue.description}</p>
                    `;
                    yield (0, email_1.sendEmail)(notifyEmail, '[GAT Portal] New Issue Report', html);
                }
            }
            catch (emailErr) {
                console.error('Failed to send issue report notification email:', emailErr);
            }
        }))();
        return res.status(201).json(issue);
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
        return res.json(issues);
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
