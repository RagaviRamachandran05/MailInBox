import { esClient } from '../config/elasticsearch';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export const EMAIL_INDEX_NAME = 'emails';

export interface EmailDocument {
  emailId: string;
  userId: string;
  campaignId: string;
  senderId?: string | null;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
}

export class ElasticsearchService {
  /**
   * Initializes the Elasticsearch index with appropriate mappings if it does not already exist.
   */
  public static async initIndex(): Promise<void> {
    try {
      const exists = await esClient.indices.exists({ index: EMAIL_INDEX_NAME });
      if (!exists) {
        await esClient.indices.create({
          index: EMAIL_INDEX_NAME,
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
        logger.info(`✅ Elasticsearch index [${EMAIL_INDEX_NAME}] initialized successfully.`);
      }
    } catch (error: any) {
      logger.warn(`⚠️ Elasticsearch initIndex notice: ${error.message}`);
    }
  }

  /**
   * Indexes or updates an email document in Elasticsearch.
   */
  public static async indexEmail(doc: EmailDocument): Promise<void> {
    try {
      await esClient.index({
        index: EMAIL_INDEX_NAME,
        id: doc.emailId,
        document: doc,
        refresh: 'wait_for',
      });
      logger.debug(`Elasticsearch indexed email document [${doc.emailId}] (Status: ${doc.status})`);
    } catch (error: any) {
      logger.warn(`Elasticsearch indexing failed for [${doc.emailId}]: ${error.message}`);
    }
  }

  /**
   * Full-text fuzzy search across emails with tenant isolation and optional status filtering.
   */
  public static async searchEmails(
    userId: string,
    queryText: string,
    statusFilter?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ emails: any[]; total: number }> {
    const from = (page - 1) * limit;

    try {
      const mustClauses: any[] = [
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

      const response = await esClient.search({
        index: EMAIL_INDEX_NAME,
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
      const emails = hits.map((hit: any) => hit._source);
      return { emails, total };
    } catch (esError: any) {
      logger.warn(`Elasticsearch search unavailable (${esError.message}). Gracefully falling back to MySQL search...`);
      
      // Graceful fallback to MySQL
      const whereClause: any = {
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
        prisma.email.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip: from,
          take: limit,
        }),
        prisma.email.count({ where: whereClause }),
      ]);

      return { emails, total };
    }
  }
}
