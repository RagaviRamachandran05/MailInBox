"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const prisma_1 = require("../config/prisma");
const emailQueue_1 = require("../queues/emailQueue");
const emailIndex_1 = require("../elasticsearch/emailIndex");
const senderService_1 = require("./senderService");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
class EmailService {
    /**
     * Schedule a new campaign and enqueue BullMQ delayed jobs for each email.
     */
    static async scheduleCampaign(input) {
        const { userId, userEmail, userName, subject, body, recipients, startTime, delayBetweenEmails = env_1.env.MIN_EMAIL_DELAY_MS, hourlyLimit = env_1.env.MAX_EMAILS_PER_HOUR, } = input;
        if (!recipients || recipients.length === 0) {
            throw new errorHandler_1.AppError('At least one valid recipient is required.', 400, 'NO_RECIPIENTS');
        }
        // Clean & validate recipients
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const cleanRecipients = Array.from(new Set(recipients
            .map(r => r.trim().toLowerCase())
            .filter(r => emailRegex.test(r))));
        if (cleanRecipients.length === 0) {
            throw new errorHandler_1.AppError('No valid email recipients provided.', 400, 'INVALID_RECIPIENTS');
        }
        // Ensure delay is at least minimum configured delay
        const effectiveDelay = Math.max(delayBetweenEmails, env_1.env.MIN_EMAIL_DELAY_MS);
        const startTimestamp = new Date(startTime).getTime();
        if (isNaN(startTimestamp)) {
            throw new errorHandler_1.AppError('Invalid start time provided.', 400, 'INVALID_START_TIME');
        }
        // Resolve sender
        let senderId = input.senderId;
        if (!senderId) {
            const defaultSender = await senderService_1.SenderService.getOrCreateDefaultSender(userId, userEmail, userName);
            senderId = defaultSender.id;
        }
        // Create Campaign in MySQL
        const campaign = await prisma_1.prisma.emailCampaign.create({
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
            const emailRecord = await prisma_1.prisma.email.create({
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
            const bullJobId = await (0, emailQueue_1.scheduleEmailJob)({
                emailId: emailRecord.id,
                campaignId: campaign.id,
                userId,
                recipient,
                senderId,
            }, emailScheduledTime);
            // Update record with BullMQ job ID
            await prisma_1.prisma.email.update({
                where: { id: emailRecord.id },
                data: { bullJobId },
            });
            // Index in Elasticsearch
            await emailIndex_1.ElasticsearchService.indexEmail({
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
        logger_1.logger.info(`🚀 Successfully scheduled campaign [${campaign.id}] with ${createdEmails.length} emails. First send at ${new Date(startTimestamp).toISOString()}`);
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
    static async getScheduledEmails(userId, page = 1, limit = 20, search) {
        const skip = (page - 1) * limit;
        const whereClause = {
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
            prisma_1.prisma.email.findMany({
                where: whereClause,
                include: {
                    sender: { select: { name: true, email: true } },
                    campaign: { select: { subject: true, delayBetweenEmails: true } },
                },
                orderBy: { scheduledAt: 'asc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.email.count({ where: whereClause }),
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
    static async getSentEmails(userId, page = 1, limit = 20, search) {
        const skip = (page - 1) * limit;
        const whereClause = {
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
            prisma_1.prisma.email.findMany({
                where: whereClause,
                include: {
                    sender: { select: { name: true, email: true } },
                    campaign: { select: { subject: true } },
                },
                orderBy: { sentAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.prisma.email.count({ where: whereClause }),
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
    static async getEmailById(id, userId) {
        const email = await prisma_1.prisma.email.findFirst({
            where: { id, userId },
            include: {
                sender: true,
                campaign: true,
            },
        });
        if (!email) {
            throw new errorHandler_1.AppError('Email record not found.', 404, 'EMAIL_NOT_FOUND');
        }
        return email;
    }
    /**
     * Delete or cancel a scheduled email.
     */
    static async deleteEmail(id, userId) {
        const email = await prisma_1.prisma.email.findFirst({
            where: { id, userId },
        });
        if (!email) {
            throw new errorHandler_1.AppError('Email record not found.', 404, 'EMAIL_NOT_FOUND');
        }
        if (email.status === 'sent') {
            throw new errorHandler_1.AppError('Cannot cancel an email that has already been sent.', 400, 'ALREADY_SENT');
        }
        // Remove from BullMQ queue
        if (email.bullJobId) {
            try {
                const job = await emailQueue_1.emailQueue.getJob(email.bullJobId);
                if (job)
                    await job.remove();
            }
            catch (err) {
                logger_1.logger.warn(`Could not delete BullMQ job ${email.bullJobId}: ${err.message}`);
            }
        }
        await prisma_1.prisma.email.delete({ where: { id } });
        return { success: true, message: 'Scheduled email cancelled successfully.' };
    }
    /**
     * Get overall email statistics for dashboard.
     */
    static async getDashboardStats(userId) {
        const [scheduledCount, sentCount, failedCount, campaignsCount] = await Promise.all([
            prisma_1.prisma.email.count({ where: { userId, status: 'scheduled' } }),
            prisma_1.prisma.email.count({ where: { userId, status: 'sent' } }),
            prisma_1.prisma.email.count({ where: { userId, status: 'failed' } }),
            prisma_1.prisma.emailCampaign.count({ where: { userId } }),
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
exports.EmailService = EmailService;
//# sourceMappingURL=emailService.js.map