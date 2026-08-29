"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkElasticsearchConnection = exports.esClient = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
exports.esClient = new elasticsearch_1.Client({
    node: env_1.env.ELASTICSEARCH_URL,
    maxRetries: 3,
    requestTimeout: 5000,
});
const checkElasticsearchConnection = async () => {
    try {
        const health = await exports.esClient.cluster.health({});
        logger_1.logger.info(`✅ Connected to Elasticsearch cluster: ${health.cluster_name} (status: ${health.status})`);
        return true;
    }
    catch (error) {
        logger_1.logger.warn(`⚠️ Elasticsearch not ready at ${env_1.env.ELASTICSEARCH_URL}: ${error.message}. Search will gracefully fallback to MySQL until online.`);
        return false;
    }
};
exports.checkElasticsearchConnection = checkElasticsearchConnection;
//# sourceMappingURL=elasticsearch.js.map