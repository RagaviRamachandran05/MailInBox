import { createEmailWorker } from './emailWorker';
import { ElasticsearchService } from '../elasticsearch/emailIndex';
import { checkElasticsearchConnection } from '../config/elasticsearch';
import { logger } from '../utils/logger';

async function bootstrapWorker() {
  logger.info('🚀 Starting Standalone BullMQ Email Worker Process...');

  await checkElasticsearchConnection();
  await ElasticsearchService.initIndex();

  const worker = createEmailWorker();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully closing BullMQ Worker...`);
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrapWorker().catch((err) => {
  logger.error('Fatal error starting worker process:', err);
  process.exit(1);
});
