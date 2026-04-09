"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const opsController_1 = require("../controllers/opsController");
const router = (0, express_1.Router)();
// All ops endpoints require admin authentication
router.get('/metrics', authMiddleware_1.authenticate, opsController_1.getOpsMetrics);
router.get('/issues-summary', authMiddleware_1.authenticate, opsController_1.getOpsIssuesSummary);
exports.default = router;
