"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmailWorker = exports.processEmailJob = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const prisma_1 = require("../config/prisma");
const transporter_1 = require("../email/transporter");
const rateLimiter_1 = require("../services/rateLimiter");
const emailIndex_1 = require("../elasticsearch/emailIndex");
const slackService_1 = require("../slack/slackService");
const emailQueue_1 = require("../queues/emailQueue");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const processEmailJob = async (job) => {
    const { emailId, userId, recipient, senderId } = job.data;
    logger_1.logger.info(`⚡ Processing email job [${job.id}] for recipient: ${recipient} (Email ID: ${emailId})`);
    // Step 1: Fetch Email record & Sender configuration from MySQL
    const email = await prisma_1.prisma.email.findUnique({
        where: { id: emailId },
        include: {
            sender: true,
            campaign: true,
        },
    });
    if (!email) {
        logger_1.logger.warn(`⚠️ Email record ${emailId} not found in database. Aborting job.`);
        return { status: 'aborted', reason: 'EMAIL_NOT_FOUND' };
    }
    // Step 2: Idempotency check - if already sent, never send again
    if (email.status === 'sent') {
        logger_1.logger.info(`🛡️ Idempotency protection: Email [${emailId}] has already been sent at ${email.sentAt}. Skipping.`);
        return { status: 'skipped', reason: 'ALREADY_SENT', messageId: email.messageId };
    }
    // Step 3: Rate Limiting Evaluation
    const effectiveSender = email.sender;
    const senderKey = email.senderId || email.userId;
    const hourlyLimit = effectiveSender?.hourlyLimit || email.campaign?.hourlyLimit || env_1.env.MAX_EMAILS_PER_HOUR;
    const senderEmail = effectiveSender?.email || 'noreply@reachinbox.com';
    const rateLimitResult = await rateLimiter_1.DistributedRateLimiter.acquireSlot(senderKey, hourlyLimit);
    if (!rateLimitResult.allowed) {
        logger_1.logger.warn(`⏳ Rate limit hit for sender [${senderEmail}] (${hourlyLimit}/hr). Rescheduling email [${emailId}] to next hour: ${rateLimitResult.nextAvailableAt.toISOString()}`);
        // Update scheduledAt in MySQL
        await prisma_1.prisma.email.update({
            where: { id: emailId },
            data: {
                scheduledAt: rateLimitResult.nextAvailableAt,
                status: 'scheduled',
            },
        });
        // Reschedule in BullMQ queue without failing
        await (0, emailQueue_1.rescheduleEmailJob)(job.data, rateLimitResult.nextAvailableAt);
        // Send real Slack Notification (deduplicated)
        await slackService_1.SlackService.sendRateLimitAlert(userId, senderKey, senderEmail, hourlyLimit, rateLimitResult.nextAvailableAt);
        return {
            status: 'rescheduled',
            reason: 'RATE_LIMIT_EXCEEDED',
            nextAvailableAt: rateLimitResult.nextAvailableAt,
        };
    }
    // Step 4: Transactional State Lock (scheduled -> processing)
    try {
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
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
            logger_1.logger.info(`🛡️ Transaction aborted: Email [${emailId}] is already completed or processing elsewhere.`);
            return { status: 'skipped', reason: 'ALREADY_PROCESSED' };
        }
    }
    catch (txError) {
        logger_1.logger.error(`Failed to lock email row for processing: ${txError.message}`);
        throw txError;
    }
    // Step 5: Send Email via Ethereal SMTP
    try {
        const { transporter, senderEmail: activeSenderEmail } = await (0, transporter_1.getOrCreateEtherealTransporter)(effectiveSender?.etherealUser, effectiveSender?.etherealPassword);
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
        const previewUrl = (0, transporter_1.getPreviewUrl)(info) || null;
        const now = new Date();
        // Step 6: Atomic update to 'sent'
        await prisma_1.prisma.email.update({
            where: { id: emailId },
            data: {
                status: 'sent',
                sentAt: now,
                messageId: info.messageId,
                previewUrl: previewUrl ? String(previewUrl) : null,
                errorMessage: null,
            },
        });
        logger_1.logger.info(`✅ Email successfully delivered to [${recipient}] | MessageID: ${info.messageId}`);
        if (previewUrl) {
            logger_1.logger.info(`🔗 Ethereal Email Preview URL: ${previewUrl}`);
        }
        // Step 7: Index into Elasticsearch
        await emailIndex_1.ElasticsearchService.indexEmail({
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
    }
    catch (sendError) {
        logger_1.logger.error(`❌ Failed to send email [${emailId}] to [${recipient}]: ${sendError.message}`);
        // Update status to 'failed' in DB
        await prisma_1.prisma.email.update({
            where: { id: emailId },
            data: {
                status: 'failed',
                errorMessage: sendError.message,
            },
        });
        // Index failure in Elasticsearch
        await emailIndex_1.ElasticsearchService.indexEmail({
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
exports.processEmailJob = processEmailJob;
/**
 * Creates and initializes the dedicated BullMQ Worker.
 */
const createEmailWorker = () => {
    const concurrency = env_1.env.WORKER_CONCURRENCY || 5;
    logger_1.logger.info(`🚀 Initializing BullMQ Worker for queue [${emailQueue_1.EMAIL_QUEUE_NAME}] with concurrency: ${concurrency}`);
    const worker = new bullmq_1.Worker(emailQueue_1.EMAIL_QUEUE_NAME, exports.processEmailJob, {
        connection: redis_1.redisConnectionOptions,
        concurrency,
    });
    worker.on('ready', () => {
        logger_1.logger.info(`✅ BullMQ Worker is ready and actively listening on queue [${emailQueue_1.EMAIL_QUEUE_NAME}]`);
    });
    worker.on('completed', (job) => {
        logger_1.logger.debug(`Job ${job.id} completed successfully.`);
    });
    worker.on('failed', (job, err) => {
        logger_1.logger.warn(`Job ${job?.id} failed with error: ${err.message} (Attempt ${job?.attemptsMade}/${job?.opts.attempts})`);
    });
    worker.on('error', (err) => {
        logger_1.logger.error('Worker internal error:', { error: err.message });
    });
    return worker;
};
exports.createEmailWorker = createEmailWorker;
//# sourceMappingURL=emailWorker.js.map