"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedRateLimiter = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
// Redis Lua script for safe check-and-increment rate limiting
const RATE_LIMIT_LUA_SCRIPT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])

  local current = tonumber(redis.call('get', key) or "0")

  if current < limit then
    local new_count = redis.call('incr', key)
    if new_count == 1 then
      redis.call('expire', key, ttl)
    end
    return { 1, limit - new_count, new_count }
  else
    return { 0, 0, current }
  end
`;
class DistributedRateLimiter {
    /**
     * Generates the time-windowed Redis key for an hourly rate limit.
     * e.g. email-rate:sender-123:2026-08-28-18
     */
    static getHourKey(identifier, date = new Date()) {
        const yyyy = date.getUTCFullYear();
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(date.getUTCDate()).padStart(2, '0');
        const hh = String(date.getUTCHours()).padStart(2, '0');
        const hourWindow = `${yyyy}-${mm}-${dd}-${hh}`;
        return `email-rate:${identifier}:${hourWindow}`;
    }
    /**
     * Calculates the exact start timestamp of the next hour window.
     */
    static getNextHourStart(date = new Date()) {
        const next = new Date(date);
        next.setUTCMinutes(0, 0, 0);
        next.setUTCHours(next.getUTCHours() + 1);
        return next;
    }
    /**
     * Acquire a rate limit slot atomically in Redis.
     *
     * @param identifier Sender ID or User ID
     * @param hourlyLimit Max emails permitted in this hour window
     */
    static async acquireSlot(identifier, hourlyLimit) {
        const key = this.getHourKey(identifier);
        const ttl = 7200; // 2 hours expiration
        try {
            // Execute atomic Lua script
            const result = (await redis_1.redis.eval(RATE_LIMIT_LUA_SCRIPT, 1, key, hourlyLimit.toString(), ttl.toString()));
            const allowed = result[0] === 1;
            const remaining = result[1];
            const currentCount = result[2];
            const nextAvailableAt = this.getNextHourStart();
            if (!allowed) {
                logger_1.logger.warn(`⚠️ Rate limit reached for [${identifier}]: ${currentCount}/${hourlyLimit} used. Next window opens at ${nextAvailableAt.toISOString()}`);
            }
            return {
                allowed,
                remaining,
                currentCount,
                limit: hourlyLimit,
                nextAvailableAt,
            };
        }
        catch (error) {
            logger_1.logger.error(`Error executing distributed rate limiter Lua script: ${error.message}`);
            // Fail open safely in case of temporary Redis script failure, or treat as allowed with fallback
            return {
                allowed: true,
                remaining: 1,
                currentCount: 0,
                limit: hourlyLimit,
                nextAvailableAt: this.getNextHourStart(),
            };
        }
    }
    /**
     * Inspect current usage without incrementing.
     */
    static async getUsage(identifier, limit) {
        const key = this.getHourKey(identifier);
        const val = await redis_1.redis.get(key);
        const count = val ? parseInt(val, 10) : 0;
        return {
            count,
            limit,
            remaining: Math.max(0, limit - count),
        };
    }
}
exports.DistributedRateLimiter = DistributedRateLimiter;
//# sourceMappingURL=rateLimiter.js.map