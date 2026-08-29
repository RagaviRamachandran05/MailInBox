import { prisma } from '../config/prisma';
import { scheduleEmailJob, emailQueue } from '../queues/emailQueue';
import { ElasticsearchService } from '../elasticsearch/emailIndex';
import { SenderService } from './senderService';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface ScheduleCampaignInput {
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string | Date;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
  senderId?: string;
}

export class EmailService {
  /**
   * Schedule a new campaign and enqueue BullMQ delayed jobs for each email.
   */
  public static async scheduleCampaign(input: ScheduleCampaignInput) {
    const {
      userId,
      userEmail,
      userName,
      subject,
      body,
      recipients,
      startTime,
      delayBetweenEmails = env.MIN_EMAIL_DELAY_MS,
      hourlyLimit = env.MAX_EMAILS_PER_HOUR,
    } = input;

    if (!recipients || recipients.length === 0) {
      throw new AppError('At least one valid recipient is required.', 400, 'NO_RECIPIENTS');
    }

    // Clean & validate recipients
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanRecipients = Array.from(
      new Set(
        recipients
          .map(r => r.trim().toLowerCase())
          .filter(r => emailRegex.test(r))
      )
    );

    if (cleanRecipients.length === 0) {
      throw new AppError('No valid email recipients provided.', 400, 'INVALID_RECIPIENTS');
    }

    // Ensure delay is at least minimum configured delay
    const effectiveDelay = Math.max(delayBetweenEmails, env.MIN_EMAIL_DELAY_MS);
    const startTimestamp = new Date(startTime).getTime();
    if (isNaN(startTimestamp)) {
      throw new AppError('Invalid start time provided.', 400, 'INVALID_START_TIME');
    }

    // Resolve sender
    let senderId = input.senderId;
    if (!senderId) {
      const defaultSender = await SenderService.getOrCreateDefaultSender(userId, userEmail, userName);
      senderId = defaultSender.id;
    }

    // Create Campaign in MySQL
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId,
        senderId,
        subject,
        body,
        startTime: new Date(startTimestamp),
        delayBetweenEmails: effectiveDelay,
        hourlyLimit,
        totalEmails: cleanRecipients.length,
      },
    });

    const createdEmails = [];
    const now = Date.now();

    // Prepare Email records with calculated staggered schedule times
    for (let i = 0; i < cleanRecipients.length; i++) {
      const recipient = cleanRecipients[i];
      // Calculate staggered schedule time: startTime + i * effectiveDelay
      const emailScheduledTime = new Date(Math.max(now, startTimestamp + (i * effectiveDelay)));
      
      // Interpolate recipient variable into subject/body preview
      const personalizedBody = body.replace(/\{\{\s*email\s*\}\}/gi, recipient);

      const emailRecord = await prisma.email.create({
        data: {
          campaignId: campaign.id,
          userId,
          senderId,
          recipient,
          subject,
          body: personalizedBody,
          scheduledAt: emailScheduledTime,
          status: 'scheduled',
          attempts: 0,
        },
      });

      // Add to BullMQ delayed queue with deterministic ID
      const bullJobId = await scheduleEmailJob(
        {
          emailId: emailRecord.id,
          campaignId: campaign.id,
          userId,
          recipient,
          senderId,
        },
        emailScheduledTime
      );

      // Update record with BullMQ job ID
      await prisma.email.update({
        where: { id: emailRecord.id },
        data: { bullJobId },
      });

      // Index in Elasticsearch
      await ElasticsearchService.indexEmail({
        emailId: emailRecord.id,
        userId,
        campaignId: campaign.id,
        senderId,
        recipient,
        subject,
        body: personalizedBody,
        status: 'scheduled',
        scheduledAt: emailScheduledTime.toISOString(),
        createdAt: emailRecord.createdAt.toISOString(),
      });

      createdEmails.push(emailRecord);
    }

    logger.info(`🚀 Successfully scheduled campaign [${campaign.id}] with ${createdEmails.length} emails. First send at ${new Date(startTimestamp).toISOString()}`);

    return {
      campaignId: campaign.id,
      totalEmails: cleanRecipients.length,
      scheduledEmails: createdEmails.length,
      delayBetweenEmails: effectiveDelay,
      firstScheduledAt: new Date(startTimestamp).toISOString(),
    };
  }

  /**
   * Fetch scheduled emails with pagination and status filtering.
   */
  public static async getScheduledEmails(
    userId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId,
      status: { in: ['scheduled', 'processing'] },
      ...(search ? {
        OR: [
          { recipient: { contains: search } },
          { subject: { contains: search } },
        ]
      } : {}),
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: whereClause,
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { subject: true, delayBetweenEmails: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.email.count({ where: whereClause }),
    ]);

    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch sent / delivered emails with pagination.
   */
  public static async getSentEmails(
    userId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId,
      status: { in: ['sent', 'failed'] },
      ...(search ? {
        OR: [
          { recipient: { contains: search } },
          { subject: { contains: search } },
        ]
      } : {}),
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: whereClause,
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { subject: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.email.count({ where: whereClause }),
    ]);

    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch email details by ID.
   */
  public static async getEmailById(id: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { id, userId },
      include: {
        sender: true,
        campaign: true,
      },
    });

    if (!email) {
      throw new AppError('Email record not found.', 404, 'EMAIL_NOT_FOUND');
    }

    return email;
  }

  /**
   * Delete or cancel a scheduled email.
   */
  public static async deleteEmail(id: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { id, userId },
    });

    if (!email) {
      throw new AppError('Email record not found.', 404, 'EMAIL_NOT_FOUND');
    }

    if (email.status === 'sent') {
      throw new AppError('Cannot cancel an email that has already been sent.', 400, 'ALREADY_SENT');
    }

    // Remove from BullMQ queue
    if (email.bullJobId) {
      try {
        const job = await emailQueue.getJob(email.bullJobId);
        if (job) await job.remove();
      } catch (err: any) {
        logger.warn(`Could not delete BullMQ job ${email.bullJobId}: ${err.message}`);
      }
    }

    await prisma.email.delete({ where: { id } });
    return { success: true, message: 'Scheduled email cancelled successfully.' };
  }

  /**
   * Get overall email statistics for dashboard.
   */
  public static async getDashboardStats(userId: string) {
    const [scheduledCount, sentCount, failedCount, campaignsCount] = await Promise.all([
      prisma.email.count({ where: { userId, status: 'scheduled' } }),
      prisma.email.count({ where: { userId, status: 'sent' } }),
      prisma.email.count({ where: { userId, status: 'failed' } }),
      prisma.emailCampaign.count({ where: { userId } }),
    ]);

    const totalProcessed = sentCount + failedCount;
    const deliveryRate = totalProcessed > 0 ? ((sentCount / totalProcessed) * 100).toFixed(1) : '100.0';

    return {
      scheduledCount,
      sentCount,
      failedCount,
      campaignsCount,
      deliveryRate: `${deliveryRate}%`,
    };
  }
}
