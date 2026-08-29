"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emailWorker_1 = require("./emailWorker");
const emailIndex_1 = require("../elasticsearch/emailIndex");
const elasticsearch_1 = require("../config/elasticsearch");
const logger_1 = require("../utils/logger");
async function bootstrapWorker() {
    logger_1.logger.info('🚀 Starting Standalone BullMQ Email Worker Process...');
    await (0, elasticsearch_1.checkElasticsearchConnection)();
    await emailIndex_1.ElasticsearchService.initIndex();
    const worker = (0, emailWorker_1.createEmailWorker)();
    const shutdown = async (signal) => {
        logger_1.logger.info(`Received ${signal}. Gracefully closing BullMQ Worker...`);
        await worker.close();
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
bootstrapWorker().catch((err) => {
    logger_1.logger.error('Fatal error starting worker process:', err);
    process.exit(1);
});
//# sourceMappingURL=workerRunner.js.map