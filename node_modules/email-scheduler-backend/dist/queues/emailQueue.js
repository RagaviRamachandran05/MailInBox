"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueStats = exports.rescheduleEmailJob = exports.scheduleEmailJob = exports.getBackoffDelay = exports.emailQueue = exports.EMAIL_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
exports.EMAIL_QUEUE_NAME = 'emailQueue';
exports.emailQueue = new bullmq_1.Queue(exports.EMAIL_QUEUE_NAME, {
    connection: redis_1.redisConnectionOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'custom',
        },
        removeOnComplete: {
            age: 86400 * 7, // Keep completed jobs for 7 days
            count: 5000,
        },
        removeOnFail: {
            age: 86400 * 14, // Keep failed jobs for 14 days
            count: 5000,
        },
    },
});
// Custom exponential backoff strategy: 5s, 30s, 120s
const getBackoffDelay = (attemptsMade) => {
    switch (attemptsMade) {
        case 1:
            return 5000; // 5 seconds
        case 2:
            return 30000; // 30 seconds
        case 3:
            return 120000; // 2 minutes
        default:
            return Math.min(120000 * Math.pow(2, attemptsMade - 3), 3600000);
    }
};
exports.getBackoffDelay = getBackoffDelay;
/**
 * Schedule a single email delayed job with BullMQ.
 * Uses deterministic jobId `email-${emailId}` for strict idempotency.
 */
const scheduleEmailJob = async (data, scheduledAt) => {
    const now = Date.now();
    const delay = Math.max(0, scheduledAt.getTime() - now);
    const jobId = `email-${data.emailId}`;
    const jobOptions = {
        jobId,
        delay,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    };
    const job = await exports.emailQueue.add('send-email', data, jobOptions);
    logger_1.logger.info(`📋 Scheduled delayed BullMQ job [${job.id}] for recipient ${data.recipient} (Delay: ${delay}ms / ${new Date(scheduledAt).toISOString()})`);
    return job.id;
};
exports.scheduleEmailJob = scheduleEmailJob;
/**
 * Reschedule an existing email job with a new scheduled time (e.g. rate limit window shift).
 */
const rescheduleEmailJob = async (data, newScheduledAt) => {
    const jobId = `email-${data.emailId}`;
    // Remove existing delayed job if present
    try {
        const existingJob = await exports.emailQueue.getJob(jobId);
        if (existingJob) {
            await existingJob.remove();
        }
    }
    catch (err) {
        logger_1.logger.warn(`Could not remove prior job ${jobId} before rescheduling: ${err.message}`);
    }
    const now = Date.now();
    const delay = Math.max(0, newScheduledAt.getTime() - now);
    const job = await exports.emailQueue.add('send-email', data, {
        jobId,
        delay,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    });
    logger_1.logger.info(`🔄 Rescheduled BullMQ job [${job.id}] for recipient ${data.recipient} to ${newScheduledAt.toISOString()} (Delay: ${delay}ms)`);
    return job.id;
};
exports.rescheduleEmailJob = rescheduleEmailJob;
/**
 * Retrieve live queue metrics for BullMQ monitoring.
 */
const getQueueStats = async () => {
    const [waiting, active, delayed, completed, failed, paused] = await Promise.all([
        exports.emailQueue.getWaitingCount(),
        exports.emailQueue.getActiveCount(),
        exports.emailQueue.getDelayedCount(),
        exports.emailQueue.getCompletedCount(),
        exports.emailQueue.getFailedCount(),
        exports.emailQueue.isPaused(),
    ]);
    return {
        waiting,
        active,
        delayed,
        completed,
        failed,
        total: waiting + active + delayed,
        isPaused: paused,
    };
};
exports.getQueueStats = getQueueStats;
//# sourceMappingURL=emailQueue.js.map