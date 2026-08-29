"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElasticsearchService = exports.EMAIL_INDEX_NAME = void 0;
const elasticsearch_1 = require("../config/elasticsearch");
const prisma_1 = require("../config/prisma");
const logger_1 = require("../utils/logger");
exports.EMAIL_INDEX_NAME = 'emails';
class ElasticsearchService {
    /**
     * Initializes the Elasticsearch index with appropriate mappings if it does not already exist.
     */
    static async initIndex() {
        try {
            const exists = await elasticsearch_1.esClient.indices.exists({ index: exports.EMAIL_INDEX_NAME });
            if (!exists) {
                await elasticsearch_1.esClient.indices.create({
                    index: exports.EMAIL_INDEX_NAME,
                    body: {
                        mappings: {
                            properties: {
                                emailId: { type: 'keyword' },
                                userId: { type: 'keyword' },
                                campaignId: { type: 'keyword' },
                                senderId: { type: 'keyword' },
                                recipient: {
                                    type: 'text',
                                    fields: {
                                        keyword: { type: 'keyword' },
                                    },
                                },
                                subject: {
                                    type: 'text',
                                    analyzer: 'standard',
                                },
                                body: {
                                    type: 'text',
                                    analyzer: 'standard',
                                },
                                status: { type: 'keyword' },
                                scheduledAt: { type: 'date' },
                                sentAt: { type: 'date' },
                                createdAt: { type: 'date' },
                            },
                        },
                    },
                });
                logger_1.logger.info(`✅ Elasticsearch index [${exports.EMAIL_INDEX_NAME}] initialized successfully.`);
            }
        }
        catch (error) {
            logger_1.logger.warn(`⚠️ Elasticsearch initIndex notice: ${error.message}`);
        }
    }
    /**
     * Indexes or updates an email document in Elasticsearch.
     */
    static async indexEmail(doc) {
        try {
            await elasticsearch_1.esClient.index({
                index: exports.EMAIL_INDEX_NAME,
                id: doc.emailId,
                document: doc,
                refresh: 'wait_for',
            });
            logger_1.logger.debug(`Elasticsearch indexed email document [${doc.emailId}] (Status: ${doc.status})`);
        }
        catch (error) {
            logger_1.logger.warn(`Elasticsearch indexing failed for [${doc.emailId}]: ${error.message}`);
        }
    }
    /**
     * Full-text fuzzy search across emails with tenant isolation and optional status filtering.
     */
    static async searchEmails(userId, queryText, statusFilter, page = 1, limit = 20) {
        const from = (page - 1) * limit;
        try {
            const mustClauses = [
                { term: { userId: userId } },
            ];
            if (statusFilter) {
                mustClauses.push({ term: { status: statusFilter } });
            }
            if (queryText && queryText.trim().length > 0) {
                mustClauses.push({
                    multi_match: {
                        query: queryText,
                        fields: ['recipient^3', 'subject^2', 'body'],
                        fuzziness: 'AUTO',
                    },
                });
            }
            const response = await elasticsearch_1.esClient.search({
                index: exports.EMAIL_INDEX_NAME,
                from,
                size: limit,
                body: {
                    query: {
                        bool: {
                            must: mustClauses,
                        },
                    },
                    sort: [
                        { createdAt: { order: 'desc' } },
                    ],
                },
            });
            const hits = response.hits.hits;
            const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;
            // Extract documents
            const emails = hits.map((hit) => hit._source);
            return { emails, total };
        }
        catch (esError) {
            logger_1.logger.warn(`Elasticsearch search unavailable (${esError.message}). Gracefully falling back to MySQL search...`);
            // Graceful fallback to MySQL
            const whereClause = {
                userId,
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(queryText ? {
                    OR: [
                        { recipient: { contains: queryText } },
                        { subject: { contains: queryText } },
                        { body: { contains: queryText } },
                    ],
                } : {}),
            };
            const [emails, total] = await Promise.all([
                prisma_1.prisma.email.findMany({
                    where: whereClause,
                    orderBy: { createdAt: 'desc' },
                    skip: from,
                    take: limit,
                }),
                prisma_1.prisma.email.count({ where: whereClause }),
            ]);
            return { emails, total };
        }
    }
}
exports.ElasticsearchService = ElasticsearchService;
//# sourceMappingURL=emailIndex.js.map