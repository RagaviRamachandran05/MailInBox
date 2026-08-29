"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackController = void 0;
const slackService_1 = require("../slack/slackService");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class SlackController {
    /**
     * GET /api/slack/connect
     */
    static async connect(req, res) {
        if (!env_1.env.SLACK_CLIENT_ID || !env_1.env.SLACK_CLIENT_SECRET) {
            return res.status(400).json({
                success: false,
                message: 'Slack OAuth is not configured in .env.',
                code: 'SLACK_OAUTH_NOT_CONFIGURED',
            });
        }
        const authUrl = slackService_1.SlackService.getSlackAuthUrl();
        return res.json({
            success: true,
            authUrl,
        });
    }
    /**
     * GET /api/slack/callback
     */
    static async callback(req, res) {
        const code = req.query.code;
        const userId = req.user?.id || req.query.state;
        if (!code) {
            return res.redirect(`${env_1.env.FRONTEND_URL}/settings?slack=error&reason=NO_CODE`);
        }
        try {
            if (!userId) {
                throw new Error('User context missing in Slack OAuth callback.');
            }
            await slackService_1.SlackService.handleOAuthCallback(code, userId);
            logger_1.logger.info(`✅ Slack connected successfully for user [${userId}]`);
            return res.redirect(`${env_1.env.FRONTEND_URL}/settings?slack=success`);
        }
        catch (error) {
            logger_1.logger.error('Slack OAuth callback error:', error);
            return res.redirect(`${env_1.env.FRONTEND_URL}/settings?slack=error`);
        }
    }
    /**
     * GET /api/slack/status
     */
    static async getStatus(req, res) {
        if (!req.user)
            return res.status(401).json({ success: false });
        const status = await slackService_1.SlackService.getSlackStatus(req.user.id);
        return res.json({
            success: true,
            data: status,
        });
    }
    /**
     * POST /api/slack/test
     */
    static async test(req, res) {
        if (!req.user)
            return res.status(401).json({ success: false });
        try {
            await slackService_1.SlackService.sendTestNotification(req.user.id);
            return res.json({
                success: true,
                message: 'Test notification sent to Slack successfully!',
            });
        }
        catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'Could not send test message to Slack.',
            });
        }
    }
    /**
     * POST /api/slack/disconnect
     */
    static async disconnect(req, res) {
        if (!req.user)
            return res.status(401).json({ success: false });
        await slackService_1.SlackService.disconnectSlack(req.user.id);
        return res.json({
            success: true,
            message: 'Slack workspace disconnected successfully.',
        });
    }
}
exports.SlackController = SlackController;
//# sourceMappingURL=slackController.js.map