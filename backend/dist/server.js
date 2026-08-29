"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const prisma_1 = require("./config/prisma");
const redis_1 = require("./config/redis");
const elasticsearch_1 = require("./config/elasticsearch");
const emailIndex_1 = require("./elasticsearch/emailIndex");
const emailWorker_1 = require("./workers/emailWorker");
const embeddedRedis_1 = require("./config/embeddedRedis");
const logger_1 = require("./utils/logger");
async function bootstrap() {
    // Automatically start embedded Redis if no Redis instance is already active
    await (0, embeddedRedis_1.startEmbeddedRedisIfRequired)();
    logger_1.logger.info('=====================================================');
    logger_1.logger.info('🚀 ReachInbox Full-Stack Email Scheduler Initializing');
    logger_1.logger.info('=====================================================');
    logger_1.logger.info(`Environment:          ${env_1.env.NODE_ENV}`);
    logger_1.logger.info(`Port:                 ${env_1.env.PORT}`);
    logger_1.logger.info(`Redis Host:           ${env_1.env.REDIS_HOST}:${env_1.env.REDIS_PORT}`);
    logger_1.logger.info(`Worker Concurrency:   ${env_1.env.WORKER_CONCURRENCY}`);
    logger_1.logger.info(`Min Delay Between:    ${env_1.env.MIN_EMAIL_DELAY_MS}ms`);
    logger_1.logger.info(`Max Emails Per Hour:  ${env_1.env.MAX_EMAILS_PER_HOUR}`);
    logger_1.logger.info('-----------------------------------------------------');
    // Verify Database Connection
    try {
        await prisma_1.prisma.$connect();
        logger_1.logger.info('✅ Database connection established via Prisma.');
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to connect to database:', error.message);
    }
    // Initialize Elasticsearch
    const hasEs = await (0, elasticsearch_1.checkElasticsearchConnection)();
    if (hasEs) {
        await emailIndex_1.ElasticsearchService.initIndex();
    }
    // Initialize integrated BullMQ worker
    let worker = null;
    try {
        worker = (0, emailWorker_1.createEmailWorker)();
    }
    catch (workerErr) {
        logger_1.logger.error('Failed to initialize integrated BullMQ worker:', workerErr);
    }
    const server = app_1.default.listen(env_1.env.PORT, () => {
        logger_1.logger.info(`🎯 Server actively listening on http://localhost:${env_1.env.PORT}`);
        logger_1.logger.info(`📊 Bull Board Dashboard mounted at http://localhost:${env_1.env.PORT}/admin/queues`);
        logger_1.logger.info(`🌐 Frontend Expected at ${env_1.env.FRONTEND_URL}`);
    });
    // Graceful Shutdown
    const gracefulShutdown = async (signal) => {
        logger_1.logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);
        server.close(async () => {
            logger_1.logger.info('HTTP server closed.');
            if (worker) {
                await worker.close();
                logger_1.logger.info('BullMQ worker closed.');
            }
            await prisma_1.prisma.$disconnect();
            logger_1.logger.info('Prisma connection closed.');
            redis_1.redis.disconnect();
            logger_1.logger.info('Redis connection closed.');
            await (0, embeddedRedis_1.stopEmbeddedRedis)();
            process.exit(0);
        });
        // Force exit if hanging
        setTimeout(() => {
            logger_1.logger.error('Forcefully terminating after 10s shutdown timeout.');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
bootstrap().catch((err) => {
    logger_1.logger.error('Fatal initialization error:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map