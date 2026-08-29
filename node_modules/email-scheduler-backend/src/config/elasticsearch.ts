import { Client } from '@elastic/elasticsearch';
import { env } from './env';
import { logger } from '../utils/logger';

export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  maxRetries: 3,
  requestTimeout: 5000,
});

export const checkElasticsearchConnection = async (): Promise<boolean> => {
  try {
    const health = await esClient.cluster.health({});
    logger.info(`✅ Connected to Elasticsearch cluster: ${health.cluster_name} (status: ${health.status})`);
    return true;
  } catch (error: any) {
    logger.warn(`⚠️ Elasticsearch not ready at ${env.ELASTICSEARCH_URL}: ${error.message}. Search will gracefully fallback to MySQL until online.`);
    return false;
  }
};
