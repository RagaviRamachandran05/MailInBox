import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { EmailService } from '../services/emailService';
import { ElasticsearchService } from '../elasticsearch/emailIndex';
import { AppError } from '../middleware/errorHandler';

export class EmailController {
  /**
   * POST /api/emails/schedule
   */
  public static async scheduleEmail(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const { subject, body, recipients, startTime, delayBetweenEmails, hourlyLimit, senderId } = req.body;

    const result = await EmailService.scheduleCampaign({
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
  public static async getScheduled(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;

    const data = await EmailService.getScheduledEmails(req.user.id, page, limit, search);
    return res.json({
      success: true,
      ...data,
    });
  }

  /**
   * GET /api/emails/sent
   */
  public static async getSent(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;

    const data = await EmailService.getSentEmails(req.user.id, page, limit, search);
    return res.json({
      success: true,
      ...data,
    });
  }

  /**
   * GET /api/emails/search?q=example
   */
  public static async searchEmails(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const queryText = (req.query.q as string) || '';
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await ElasticsearchService.searchEmails(req.user.id, queryText, status, page, limit);

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
  public static async getStats(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const stats = await EmailService.getDashboardStats(req.user.id);
    return res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * GET /api/emails/:id
   */
  public static async getById(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const email = await EmailService.getEmailById(req.params.id, req.user.id);
    return res.json({
      success: true,
      data: email,
    });
  }

  /**
   * DELETE /api/emails/:id
   */
  public static async deleteEmail(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const result = await EmailService.deleteEmail(req.params.id, req.user.id);
    return res.json(result);
  }
}
