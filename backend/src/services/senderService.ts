import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class SenderService {
  /**
   * Get or create a default sender for a user.
   */
  public static async getOrCreateDefaultSender(userId: string, userEmail: string, userName: string) {
    const existing = await prisma.sender.findFirst({
      where: { userId, active: true },
      orderBy: { isDefault: 'desc' },
    });

    if (existing) {
      return existing;
    }

    // Create default Ethereal sender
    const defaultSender = await prisma.sender.create({
      data: {
        userId,
        name: `${userName} (Default)`,
        email: env.ETHEREAL_USER || userEmail,
        etherealUser: env.ETHEREAL_USER || null,
        etherealPassword: env.ETHEREAL_PASSWORD || null,
        hourlyLimit: env.MAX_EMAILS_PER_HOUR,
        isDefault: true,
        active: true,
      },
    });

    logger.info(`✨ Created default sender for user ${userId}: ${defaultSender.email}`);
    return defaultSender;
  }

  /**
   * List all senders for a user.
   */
  public static async listSenders(userId: string) {
    return prisma.sender.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Create a new custom sender.
   */
  public static async createSender(userId: string, data: {
    name: string;
    email: string;
    etherealUser?: string;
    etherealPassword?: string;
    hourlyLimit?: number;
    isDefault?: boolean;
  }) {
    if (data.isDefault) {
      // Unset previous defaults
      await prisma.sender.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return prisma.sender.create({
      data: {
        userId,
        name: data.name,
        email: data.email,
        etherealUser: data.etherealUser || null,
        etherealPassword: data.etherealPassword || null,
        hourlyLimit: data.hourlyLimit || env.MAX_EMAILS_PER_HOUR,
        isDefault: data.isDefault || false,
        active: true,
      },
    });
  }

  /**
   * Delete or deactivate a sender.
   */
  public static async deleteSender(userId: string, senderId: string) {
    return prisma.sender.deleteMany({
      where: { id: senderId, userId },
    });
  }
}
