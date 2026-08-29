"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackService = void 0;
const web_api_1 = require("@slack/web-api");
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../config/prisma");
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class SlackService {
    /**
     * Generates the Slack OAuth v2 authorization URL.
     */
    static getSlackAuthUrl() {
        const scopes = ['chat:write', 'chat:write.public', 'incoming-webhook'];
        const url = new URL('https://slack.com/oauth/v2/authorize');
        url.searchParams.set('client_id', env_1.env.SLACK_CLIENT_ID);
        url.searchParams.set('scope', scopes.join(','));
        url.searchParams.set('redirect_uri', env_1.env.SLACK_REDIRECT_URI);
        return url.toString();
    }
    /**
     * Handles the Slack OAuth code exchange callback.
     */
    static async handleOAuthCallback(code, userId) {
        try {
            const response = await axios_1.default.post('https://slack.com/api/oauth.v2.access', null, {
                params: {
                    client_id: env_1.env.SLACK_CLIENT_ID,
                    client_secret: env_1.env.SLACK_CLIENT_SECRET,
                    code,
                    redirect_uri: env_1.env.SLACK_REDIRECT_URI,
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const data = response.data;
            if (!data.ok) {
                throw new Error(data.error || 'Failed to exchange Slack OAuth code.');
            }
            const teamId = data.team?.id || 'default-team';
            const teamName = data.team?.name || 'Slack Workspace';
            const accessToken = data.access_token || '';
            const webhookUrl = data.incoming_webhook?.url || null;
            // Upsert connection in database
            const existing = await prisma_1.prisma.slackConnection.findFirst({
                where: { userId },
            });
            if (existing) {
                return await prisma_1.prisma.slackConnection.update({
                    where: { id: existing.id },
                    data: {
                        teamId,
                        teamName,
                        accessToken,
                        incomingWebhookUrl: webhookUrl,
                        connected: true,
                    },
                });
            }
            else {
                return await prisma_1.prisma.slackConnection.create({
                    data: {
                        userId,
                        teamId,
                        teamName,
                        accessToken,
                        incomingWebhookUrl: webhookUrl,
                        connected: true,
                    },
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Slack OAuth exchange error:', error);
            throw error;
        }
    }
    /**
     * Sends rate-limit notification to user's connected Slack workspace.
     * Deduplicated via Redis key to guarantee at most 1 alert per sender per hour window.
     */
    static async sendRateLimitAlert(userId, senderId, senderEmail, hourlyLimit, nextWindow) {
        try {
            // Check Slack connection or environment webhook
            const connection = await prisma_1.prisma.slackConnection.findFirst({
                where: { userId, connected: true },
            });
            const webhookUrl = connection?.incomingWebhookUrl || env_1.env.SLACK_WEBHOOK_URL;
            if (!webhookUrl && !connection?.accessToken) {
                // Slack not configured; silently ignore as per requirements
                return false;
            }
            // Check Redis deduplication key
            const yyyy = nextWindow.getUTCFullYear();
            const mm = String(nextWindow.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(nextWindow.getUTCDate()).padStart(2, '0');
            const hh = String(nextWindow.getUTCHours() - 1).padStart(2, '0'); // Window that just filled
            const dedupKey = `slack-rate-limit-notified:${senderId || userId}:${yyyy}-${mm}-${dd}-${hh}`;
            const alreadyNotified = await redis_1.redis.get(dedupKey);
            if (alreadyNotified) {
                logger_1.logger.info(`Slack alert already dispatched for sender [${senderEmail}] in window [${dedupKey}]. Skipping notification.`);
                return false;
            }
            const formattedNextTime = nextWindow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
            const messageText = `⚠️ *Email rate limit reached for sender:* \`${senderEmail}\`\n• *Hourly Limit:* ${hourlyLimit} emails\n• *Action:* Remaining queued emails have been automatically rescheduled for the next available window (*${formattedNextTime}*).\n• *System Status:* Rescheduling preserved email delay spacing.`;
            if (webhookUrl) {
                await axios_1.default.post(webhookUrl, {
                    text: messageText,
                });
            }
            else if (connection?.accessToken) {
                const client = new web_api_1.WebClient(connection.accessToken);
                const channels = await client.conversations.list({ types: 'public_channel,private_channel', limit: 10 });
                const defaultChannel = channels.channels?.[0]?.id;
                if (defaultChannel) {
                    await client.chat.postMessage({
                        channel: defaultChannel,
                        text: messageText,
                    });
                }
            }
            // Mark as notified in Redis with 2-hour TTL
            await redis_1.redis.set(dedupKey, '1', 'EX', 7200);
            logger_1.logger.info(`📢 Slack rate-limit alert sent successfully for sender [${senderEmail}].`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to send Slack rate-limit alert:', { error: error.message });
            return false;
        }
    }
    /**
     * Send a manual test notification to Slack
     */
    static async sendTestNotification(userId) {
        const connection = await prisma_1.prisma.slackConnection.findFirst({
            where: { userId, connected: true },
        });
        const webhookUrl = connection?.incomingWebhookUrl || env_1.env.SLACK_WEBHOOK_URL;
        if (!webhookUrl && !connection?.accessToken) {
            throw new Error('No Slack Webhook URL or OAuth connection configured.');
        }
        const testMessage = `🚀 *AuraMail Slack Integration Connected!*\n• *Workspace:* Active\n• *Status:* Real-time rate-limit & queue alerts are now operational.\n• *Timestamp:* ${new Date().toLocaleString()}`;
        if (webhookUrl) {
            await axios_1.default.post(webhookUrl, {
                text: testMessage,
            });
            return true;
        }
        else if (connection?.accessToken) {
            const client = new web_api_1.WebClient(connection.accessToken);
            const channels = await client.conversations.list({ types: 'public_channel,private_channel', limit: 10 });
            const defaultChannel = channels.channels?.[0]?.id;
            if (defaultChannel) {
                await client.chat.postMessage({
                    channel: defaultChannel,
                    text: testMessage,
                });
                return true;
            }
        }
        return false;
    }
    /**
     * Get user's current Slack status.
     */
    static async getSlackStatus(userId) {
        const conn = await prisma_1.prisma.slackConnection.findFirst({
            where: { userId, connected: true },
            select: {
                id: true,
                teamId: true,
                teamName: true,
                connected: true,
                createdAt: true,
            },
        });
        if (conn && conn.connected) {
            return {
                connected: true,
                teamName: conn.teamName || 'Slack Workspace',
                teamId: conn.teamId || null,
            };
        }
        if (env_1.env.SLACK_WEBHOOK_URL) {
            return {
                connected: true,
                teamName: 'Incoming Webhook Active',
                teamId: 'webhook-configured',
            };
        }
        return {
            connected: false,
            teamName: null,
            teamId: null,
        };
    }
    /**
     * Disconnect Slack.
     */
    static async disconnectSlack(userId) {
        await prisma_1.prisma.slackConnection.updateMany({
            where: { userId },
            data: { connected: false },
        });
    }
}
exports.SlackService = SlackService;
//# sourceMappingURL=slackService.js.map