"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenderController = void 0;
const senderService_1 = require("../services/senderService");
const errorHandler_1 = require("../middleware/errorHandler");
class SenderController {
    /**
     * GET /api/senders
     */
    static async listSenders(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        // Ensure user has at least a default sender
        await senderService_1.SenderService.getOrCreateDefaultSender(req.user.id, req.user.email, req.user.name);
        const senders = await senderService_1.SenderService.listSenders(req.user.id);
        return res.json({
            success: true,
            data: senders,
        });
    }
    /**
     * POST /api/senders
     */
    static async createSender(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        const { name, email, etherealUser, etherealPassword, hourlyLimit, isDefault } = req.body;
        const sender = await senderService_1.SenderService.createSender(req.user.id, {
            name,
            email,
            etherealUser,
            etherealPassword,
            hourlyLimit: hourlyLimit ? Number(hourlyLimit) : undefined,
            isDefault: Boolean(isDefault),
        });
        return res.status(201).json({
            success: true,
            message: 'Sender added successfully.',
            data: sender,
        });
    }
    /**
     * DELETE /api/senders/:id
     */
    static async deleteSender(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        await senderService_1.SenderService.deleteSender(req.user.id, req.params.id);
        return res.json({
            success: true,
            message: 'Sender removed successfully.',
        });
    }
}
exports.SenderController = SenderController;
//# sourceMappingURL=senderController.js.map