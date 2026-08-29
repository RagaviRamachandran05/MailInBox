"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const emailService_1 = require("../services/emailService");
const emailIndex_1 = require("../elasticsearch/emailIndex");
const errorHandler_1 = require("../middleware/errorHandler");
class EmailController {
    /**
     * POST /api/emails/schedule
     */
    static async scheduleEmail(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        const { subject, body, recipients, startTime, delayBetweenEmails, hourlyLimit, senderId } = req.body;
        const result = await emailService_1.EmailService.scheduleCampaign({
            userId: req.user.id,
            userEmail: req.user.email,
            userName: req.user.name,
            subject,
            body,
            recipients,
            startTime,
            delayBetweenEmails: delayBetweenEmails ? Number(delayBetweenEmails) : undefined,
            hourlyLimit: hourlyLimit ? Number(hourlyLimit) : undefined,
            senderId,
        });
        return res.status(201).json({
            success: true,
            message: `${result.scheduledEmails} emails scheduled successfully.`,
            data: result,
        });
    }
    /**
     * GET /api/emails/scheduled
     */
    static async getScheduled(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const search = req.query.search;
        const data = await emailService_1.EmailService.getScheduledEmails(req.user.id, page, limit, search);
        return res.json({
            success: true,
            ...data,
        });
    }
    /**
     * GET /api/emails/sent
     */
    static async getSent(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const search = req.query.search;
        const data = await emailService_1.EmailService.getSentEmails(req.user.id, page, limit, search);
        return res.json({
            success: true,
            ...data,
        });
    }
    /**
     * GET /api/emails/search?q=example
     */
    static async searchEmails(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        const queryText = req.query.q || '';
        const status = req.query.status;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const result = await emailIndex_1.ElasticsearchService.searchEmails(req.user.id, queryText, status, page, limit);
        return res.json({
            success: true,
            query: queryText,
            data: result.emails,
            total: result.total,
            page,
            limit,
        });
    }
    /**
     * GET /api/emails/stats
     */
    static async getStats(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        const stats = await emailService_1.EmailService.getDashboardStats(req.user.id);
        return res.json({
            success: true,
            data: stats,
        });
    }
    /**
     * GET /api/emails/:id
     */
    static async getById(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        const email = await emailService_1.EmailService.getEmailById(req.params.id, req.user.id);
        return res.json({
            success: true,
            data: email,
        });
    }
    /**
     * DELETE /api/emails/:id
     */
    static async deleteEmail(req, res) {
        if (!req.user)
            throw new errorHandler_1.AppError('Unauthorized', 401);
        const result = await emailService_1.EmailService.deleteEmail(req.params.id, req.user.id);
        return res.json(result);
    }
}
exports.EmailController = EmailController;
//# sourceMappingURL=emailController.js.map