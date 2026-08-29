import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { prisma } from '../config/prisma';
import { getOrCreateEtherealTransporter, getPreviewUrl } from '../email/transporter';
import { DistributedRateLimiter } from '../services/rateLimiter';
import { ElasticsearchService } from '../elasticsearch/emailIndex';
import { SlackService } from '../slack/slackService';
import { EmailJobData, EMAIL_QUEUE_NAME, rescheduleEmailJob } from '../queues/emailQueue';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const processEmailJob = async (job: Job<EmailJobData>): Promise<any> => {
  const { emailId, userId, recipient, senderId } = job.data;
  logger.info(`⚡ Processing email job [${job.id}] for recipient: ${recipient} (Email ID: ${emailId})`);

  // Step 1: Fetch Email record & Sender configuration from MySQL
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      sender: true,
      campaign: true,
    },
  });

  if (!email) {
    logger.warn(`⚠️ Email record ${emailId} not found in database. Aborting job.`);
    return { status: 'aborted', reason: 'EMAIL_NOT_FOUND' };
  }

  // Step 2: Idempotency check - if already sent, never send again
  if (email.status === 'sent') {
    logger.info(`🛡️ Idempotency protection: Email [${emailId}] has already been sent at ${email.sentAt}. Skipping.`);
    return { status: 'skipped', reason: 'ALREADY_SENT', messageId: email.messageId };
  }

  // Step 3: Rate Limiting Evaluation
  const effectiveSender = email.sender;
  const senderKey = email.senderId || email.userId;
  const hourlyLimit = effectiveSender?.hourlyLimit || email.campaign?.hourlyLimit || env.MAX_EMAILS_PER_HOUR;
  const senderEmail = effectiveSender?.email || 'noreply@reachinbox.com';

  const rateLimitResult = await DistributedRateLimiter.acquireSlot(senderKey, hourlyLimit);

  if (!rateLimitResult.allowed) {
    logger.warn(`⏳ Rate limit hit for sender [${senderEmail}] (${hourlyLimit}/hr). Rescheduling email [${emailId}] to next hour: ${rateLimitResult.nextAvailableAt.toISOString()}`);

    // Update scheduledAt in MySQL
    await prisma.email.update({
      where: { id: emailId },
      data: {
        scheduledAt: rateLimitResult.nextAvailableAt,
        status: 'scheduled',
      },
    });

    // Reschedule in BullMQ queue without failing
    await rescheduleEmailJob(job.data, rateLimitResult.nextAvailableAt);

    // Send real Slack Notification (deduplicated)
    await SlackService.sendRateLimitAlert(
      userId,
      senderKey,
      senderEmail,
      hourlyLimit,
      rateLimitResult.nextAvailableAt
    );

    return {
      status: 'rescheduled',
      reason: 'RATE_LIMIT_EXCEEDED',
      nextAvailableAt: rateLimitResult.nextAvailableAt,
    };
  }

  // Step 4: Transactional State Lock (scheduled -> processing)
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.email.findUnique({ where: { id: emailId } });
      if (!current || current.status === 'sent') {
        return null;
      }
      return tx.email.update({
        where: { id: emailId },
        data: {
          status: 'processing',
          attempts: { increment: 1 },
        },
      });
    });

    if (!updated) {
      logger.info(`🛡️ Transaction aborted: Email [${emailId}] is already completed or processing elsewhere.`);
      return { status: 'skipped', reason: 'ALREADY_PROCESSED' };
    }
  } catch (txError: any) {
    logger.error(`Failed to lock email row for processing: ${txError.message}`);
    throw txError;
  }

  // Step 5: Send Email via Ethereal SMTP
  try {
    const { transporter, senderEmail: activeSenderEmail } = await getOrCreateEtherealTransporter(
      effectiveSender?.etherealUser,
      effectiveSender?.etherealPassword
    );

    const fromAddress = `"${effectiveSender?.name || 'AuraMail Scheduler'}" <${activeSenderEmail}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject: email.subject,
      text: email.body,
      html: `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #f43f5e; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 20px;">${email.subject}</h2>
          </div>
          <div style="font-size: 15px; line-height: 1.6; white-space: pre-line;">
            ${email.body}
          </div>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; text-align: center;">
            Sent via <strong>AuraMail High-Performance Scheduler</strong> • Automated Delivery
          </div>
        </div>
      `,
    });

    const previewUrl = getPreviewUrl(info) || null;
    const now = new Date();

    // Step 6: Atomic update to 'sent'
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'sent',
        sentAt: now,
        messageId: info.messageId,
        previewUrl: previewUrl ? String(previewUrl) : null,
        errorMessage: null,
      },
    });

    logger.info(`✅ Email successfully delivered to [${recipient}] | MessageID: ${info.messageId}`);
    if (previewUrl) {
      logger.info(`🔗 Ethereal Email Preview URL: ${previewUrl}`);
    }

    // Step 7: Index into Elasticsearch
    await ElasticsearchService.indexEmail({
      emailId,
      userId,
      campaignId: email.campaignId,
      senderId: email.senderId,
      recipient,
      subject: email.subject,
      body: email.body,
      status: 'sent',
      scheduledAt: email.scheduledAt.toISOString(),
      sentAt: now.toISOString(),
      createdAt: email.createdAt.toISOString(),
    });

    return {
      status: 'sent',
      messageId: info.messageId,
      previewUrl,
    };
  } catch (sendError: any) {
    logger.error(`❌ Failed to send email [${emailId}] to [${recipient}]: ${sendError.message}`);

    // Update status to 'failed' in DB
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'failed',
        errorMessage: sendError.message,
      },
    });

    // Index failure in Elasticsearch
    await ElasticsearchService.indexEmail({
      emailId,
      userId,
      campaignId: email.campaignId,
      senderId: email.senderId,
      recipient,
      subject: email.subject,
      body: email.body,
      status: 'failed',
      scheduledAt: email.scheduledAt.toISOString(),
      createdAt: email.createdAt.toISOString(),
    });

    // Re-throw so BullMQ triggers exponential backoff retry if attempts remain
    throw sendError;
  }
};

/**
 * Creates and initializes the dedicated BullMQ Worker.
 */
export const createEmailWorker = () => {
  const concurrency = env.WORKER_CONCURRENCY || 5;
  logger.info(`🚀 Initializing BullMQ Worker for queue [${EMAIL_QUEUE_NAME}] with concurrency: ${concurrency}`);

  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    processEmailJob,
    {
      connection: redisConnectionOptions,
      concurrency,
    }
  );

  worker.on('ready', () => {
    logger.info(`✅ BullMQ Worker is ready and actively listening on queue [${EMAIL_QUEUE_NAME}]`);
  });

  worker.on('completed', (job) => {
    logger.debug(`Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    logger.warn(`Job ${job?.id} failed with error: ${err.message} (Attempt ${job?.attemptsMade}/${job?.opts.attempts})`);
  });

  worker.on('error', (err) => {
    logger.error('Worker internal error:', { error: err.message });
  });

  return worker;
};
