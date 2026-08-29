"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenderService = void 0;
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class SenderService {
    /**
     * Get or create a default sender for a user.
     */
    static async getOrCreateDefaultSender(userId, userEmail, userName) {
        const existing = await prisma_1.prisma.sender.findFirst({
            where: { userId, active: true },
            orderBy: { isDefault: 'desc' },
        });
        if (existing) {
            return existing;
        }
        // Create default Ethereal sender
        const defaultSender = await prisma_1.prisma.sender.create({
            data: {
                userId,
                name: `${userName} (Default)`,
                email: env_1.env.ETHEREAL_USER || userEmail,
                etherealUser: env_1.env.ETHEREAL_USER || null,
                etherealPassword: env_1.env.ETHEREAL_PASSWORD || null,
                hourlyLimit: env_1.env.MAX_EMAILS_PER_HOUR,
                isDefault: true,
                active: true,
            },
        });
        logger_1.logger.info(`✨ Created default sender for user ${userId}: ${defaultSender.email}`);
        return defaultSender;
    }
    /**
     * List all senders for a user.
     */
    static async listSenders(userId) {
        return prisma_1.prisma.sender.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }
    /**
     * Create a new custom sender.
     */
    static async createSender(userId, data) {
        if (data.isDefault) {
            // Unset previous defaults
            await prisma_1.prisma.sender.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }
        return prisma_1.prisma.sender.create({
            data: {
                userId,
                name: data.name,
                email: data.email,
                etherealUser: data.etherealUser || null,
                etherealPassword: data.etherealPassword || null,
                hourlyLimit: data.hourlyLimit || env_1.env.MAX_EMAILS_PER_HOUR,
                isDefault: data.isDefault || false,
                active: true,
            },
        });
    }
    /**
     * Delete or deactivate a sender.
     */
    static async deleteSender(userId, senderId) {
        return prisma_1.prisma.sender.deleteMany({
            where: { id: senderId, userId },
        });
    }
}
exports.SenderService = SenderService;
//# sourceMappingURL=senderService.js.map