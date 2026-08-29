"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prismaClientSingleton = () => {
    const client = new client_1.PrismaClient({
        log: [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
        ],
    });
    client.$on('error', (e) => {
        logger_1.logger.error('Prisma Error:', e);
    });
    client.$on('warn', (e) => {
        logger_1.logger.warn('Prisma Warning:', e);
    });
    return client;
};
exports.prisma = globalThis.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = exports.prisma;
}
//# sourceMappingURL=prisma.js.map