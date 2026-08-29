"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const queueController_1 = require("../controllers/queueController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Allow authenticated users to view live queue stats for the dashboard and demo panel
router.get('/stats', auth_1.requireAuth, queueController_1.getQueueMetrics);
exports.default = router;
//# sourceMappingURL=queueRoutes.js.map