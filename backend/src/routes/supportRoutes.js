"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supportController_1 = require("../controllers/supportController");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
const supportLimiter = (0, rateLimit_1.simpleRateLimit)({ windowMs: 60 * 1000, max: 8, keyPrefix: 'support' });
router.post('/support/issues', supportLimiter, supportController_1.createIssueReport);
exports.default = router;
