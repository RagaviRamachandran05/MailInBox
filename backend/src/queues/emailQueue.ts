import { Queue, JobsOptions } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { logger } from '../utils/logger';

export interface EmailJobData {
  emailId: string;
  campaignId: string;
  userId: string;
  recipient: string;
  senderId?: string | null;
}

export const EMAIL_QUEUE_NAME = 'emailQueue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
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
export const getBackoffDelay = (attemptsMade: number): number => {
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

/**
 * Schedule a single email delayed job with BullMQ.
 * Uses deterministic jobId `email-${emailId}` for strict idempotency.
 */
export const scheduleEmailJob = async (
  data: EmailJobData,
  scheduledAt: Date
): Promise<string> => {
  const now = Date.now();
  const delay = Math.max(0, scheduledAt.getTime() - now);
  const jobId = `email-${data.emailId}`;

  const jobOptions: JobsOptions = {
    jobId,
    delay,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  };

  const job = await emailQueue.add('send-email', data, jobOptions);
  logger.info(`📋 Scheduled delayed BullMQ job [${job.id}] for recipient ${data.recipient} (Delay: ${delay}ms / ${new Date(scheduledAt).toISOString()})`);
  return job.id!;
};

/**
 * Reschedule an existing email job with a new scheduled time (e.g. rate limit window shift).
 */
export const rescheduleEmailJob = async (
  data: EmailJobData,
  newScheduledAt: Date
): Promise<string> => {
  const jobId = `email-${data.emailId}`;
  
  // Remove existing delayed job if present
  try {
    const existingJob = await emailQueue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
    }
  } catch (err: any) {
    logger.warn(`Could not remove prior job ${jobId} before rescheduling: ${err.message}`);
  }

  const now = Date.now();
  const delay = Math.max(0, newScheduledAt.getTime() - now);

  const job = await emailQueue.add('send-email', data, {
    jobId,
    delay,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });

  logger.info(`🔄 Rescheduled BullMQ job [${job.id}] for recipient ${data.recipient} to ${newScheduledAt.toISOString()} (Delay: ${delay}ms)`);
  return job.id!;
};

/**
 * Retrieve live queue metrics for BullMQ monitoring.
 */
export const getQueueStats = async () => {
  const [waiting, active, delayed, completed, failed, paused] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getDelayedCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.isPaused(),
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
