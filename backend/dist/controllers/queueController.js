"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueMetrics = exports.bullBoardRouter = void 0;
const api_1 = require("@bull-board/api");
const bullMQAdapter_1 = require("@bull-board/api/bullMQAdapter");
const express_1 = require("@bull-board/express");
const emailQueue_1 = require("../queues/emailQueue");
const serverAdapter = new express_1.ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
(0, api_1.createBullBoard)({
    queues: [new bullMQAdapter_1.BullMQAdapter(emailQueue_1.emailQueue)],
    serverAdapter,
});
exports.bullBoardRouter = serverAdapter.getRouter();
const getQueueMetrics = async (req, res) => {
    try {
        const stats = await (0, emailQueue_1.getQueueStats)();
        return res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch queue statistics.',
            error: error.message,
        });
    }
};
exports.getQueueMetrics = getQueueMetrics;
//# sourceMappingURL=queueController.js.map