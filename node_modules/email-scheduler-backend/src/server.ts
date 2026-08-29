import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';
import { checkElasticsearchConnection } from './config/elasticsearch';
import { ElasticsearchService } from './elasticsearch/emailIndex';
import { createEmailWorker } from './workers/emailWorker';
import { startEmbeddedRedisIfRequired, stopEmbeddedRedis } from './config/embeddedRedis';
import { logger } from './utils/logger';

async function bootstrap() {
  // Automatically start embedded Redis if no Redis instance is already active
  await startEmbeddedRedisIfRequired();

  logger.info('=====================================================');
  logger.info('🚀 ReachInbox Full-Stack Email Scheduler Initializing');
  logger.info('=====================================================');
  logger.info(`Environment:          ${env.NODE_ENV}`);
  logger.info(`Port:                 ${env.PORT}`);
  logger.info(`Redis Host:           ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  logger.info(`Worker Concurrency:   ${env.WORKER_CONCURRENCY}`);
  logger.info(`Min Delay Between:    ${env.MIN_EMAIL_DELAY_MS}ms`);
  logger.info(`Max Emails Per Hour:  ${env.MAX_EMAILS_PER_HOUR}`);
  logger.info('-----------------------------------------------------');

  // Verify Database Connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connection established via Prisma.');
  } catch (error: any) {
    logger.error('❌ Failed to connect to database:', error.message);
  }

  // Initialize Elasticsearch
  const hasEs = await checkElasticsearchConnection();
  if (hasEs) {
    await ElasticsearchService.initIndex();
  }

  // Initialize integrated BullMQ worker
  let worker: any = null;
  try {
    worker = createEmailWorker();
  } catch (workerErr: any) {
    logger.error('Failed to initialize integrated BullMQ worker:', workerErr);
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`🎯 Server actively listening on http://localhost:${env.PORT}`);
    logger.info(`📊 Bull Board Dashboard mounted at http://localhost:${env.PORT}/admin/queues`);
    logger.info(`🌐 Frontend Expected at ${env.FRONTEND_URL}`);
  });

  // Graceful Shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed.');

      if (worker) {
        await worker.close();
        logger.info('BullMQ worker closed.');
      }

      await prisma.$disconnect();
      logger.info('Prisma connection closed.');

      redis.disconnect();
      logger.info('Redis connection closed.');

      await stopEmbeddedRedis();

      process.exit(0);
    });

    // Force exit if hanging
    setTimeout(() => {
      logger.error('Forcefully terminating after 10s shutdown timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal initialization error:', err);
  process.exit(1);
});
