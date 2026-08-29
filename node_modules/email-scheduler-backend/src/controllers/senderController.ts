import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SenderService } from '../services/senderService';
import { AppError } from '../middleware/errorHandler';

export class SenderController {
  /**
   * GET /api/senders
   */
  public static async listSenders(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    // Ensure user has at least a default sender
    await SenderService.getOrCreateDefaultSender(req.user.id, req.user.email, req.user.name);

    const senders = await SenderService.listSenders(req.user.id);
    return res.json({
      success: true,
      data: senders,
    });
  }

  /**
   * POST /api/senders
   */
  public static async createSender(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const { name, email, etherealUser, etherealPassword, hourlyLimit, isDefault } = req.body;

    const sender = await SenderService.createSender(req.user.id, {
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
  public static async deleteSender(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw new AppError('Unauthorized', 401);

    await SenderService.deleteSender(req.user.id, req.params.id);
    return res.json({
      success: true,
      message: 'Sender removed successfully.',
    });
  }
}
