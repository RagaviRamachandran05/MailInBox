import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SlackService } from '../slack/slackService';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class SlackController {
  /**
   * GET /api/slack/connect
   */
  public static async connect(req: AuthenticatedRequest, res: Response) {
    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      return res.status(400).json({
        success: false,
        message: 'Slack OAuth is not configured in .env.',
        code: 'SLACK_OAUTH_NOT_CONFIGURED',
      });
    }

    const authUrl = SlackService.getSlackAuthUrl();
    return res.json({
      success: true,
      authUrl,
    });
  }

  /**
   * GET /api/slack/callback
   */
  public static async callback(req: AuthenticatedRequest, res: Response) {
    const code = req.query.code as string;
    const userId = req.user?.id || (req.query.state as string);

    if (!code) {
      return res.redirect(`${env.FRONTEND_URL}/settings?slack=error&reason=NO_CODE`);
    }

    try {
      if (!userId) {
        throw new Error('User context missing in Slack OAuth callback.');
      }
      await SlackService.handleOAuthCallback(code, userId);
      logger.info(`✅ Slack connected successfully for user [${userId}]`);
      return res.redirect(`${env.FRONTEND_URL}/settings?slack=success`);
    } catch (error: any) {
      logger.error('Slack OAuth callback error:', error);
      return res.redirect(`${env.FRONTEND_URL}/settings?slack=error`);
    }
  }

  /**
   * GET /api/slack/status
   */
  public static async getStatus(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false });

    const status = await SlackService.getSlackStatus(req.user.id);
    return res.json({
      success: true,
      data: status,
    });
  }

  /**
   * POST /api/slack/test
   */
  public static async test(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false });

    try {
      await SlackService.sendTestNotification(req.user.id);
      return res.json({
        success: true,
        message: 'Test notification sent to Slack successfully!',
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Could not send test message to Slack.',
      });
    }
  }

  /**
   * POST /api/slack/disconnect
   */
  public static async disconnect(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false });

    await SlackService.disconnectSlack(req.user.id);
    return res.json({
      success: true,
      message: 'Slack workspace disconnected successfully.',
    });
  }
}
