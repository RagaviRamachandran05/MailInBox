"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.redisConnectionOptions = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
exports.redisConnectionOptions = {
    host: env_1.env.REDIS_HOST,
    port: env_1.env.REDIS_PORT,
    password: env_1.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
        const delay = Math.min(times * 200, 3000);
        logger_1.logger.warn(`Redis connection retry attempt #${times}, delay: ${delay}ms`);
        return delay;
    },
};
// Singleton instance for general application caching & distributed rate-limiting
exports.redis = new ioredis_1.default(exports.redisConnectionOptions);
exports.redis.on('connect', () => {
    logger_1.logger.info(`✅ Connected to Redis at ${env_1.env.REDIS_HOST}:${env_1.env.REDIS_PORT}`);
});
exports.redis.on('error', (err) => {
    logger_1.logger.error('❌ Redis connection error:', { error: err.message });
});
//# sourceMappingURL=redis.js.map