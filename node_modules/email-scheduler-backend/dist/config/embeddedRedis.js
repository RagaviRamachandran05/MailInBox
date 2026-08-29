"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopEmbeddedRedis = exports.startEmbeddedRedisIfRequired = exports.isPortListening = void 0;
const net_1 = __importDefault(require("net"));
const logger_1 = require("../utils/logger");
const env_1 = require("./env");
let memoryServerInstance = null;
const isPortListening = (port, host = '127.0.0.1') => {
    return new Promise((resolve) => {
        const socket = new net_1.default.Socket();
        socket.setTimeout(400);
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.once('error', () => {
            resolve(false);
        });
        socket.connect(port, host);
    });
};
exports.isPortListening = isPortListening;
const startEmbeddedRedisIfRequired = async () => {
    if (env_1.env.REDIS_HOST !== 'localhost' && env_1.env.REDIS_HOST !== '127.0.0.1') {
        return;
    }
    const isRunning = await (0, exports.isPortListening)(env_1.env.REDIS_PORT, env_1.env.REDIS_HOST);
    if (isRunning) {
        logger_1.logger.info(`⚡ Redis instance detected on ${env_1.env.REDIS_HOST}:${env_1.env.REDIS_PORT}`);
        return;
    }
    try {
        logger_1.logger.info(`🔄 No Redis server found on ${env_1.env.REDIS_HOST}:${env_1.env.REDIS_PORT}. Initializing embedded Redis server...`);
        const { RedisMemoryServer } = await Promise.resolve().then(() => __importStar(require('redis-memory-server')));
        memoryServerInstance = new RedisMemoryServer({
            instance: {
                port: env_1.env.REDIS_PORT,
            },
        });
        await memoryServerInstance.start();
        logger_1.logger.info(`✅ Embedded Redis server successfully started on port ${env_1.env.REDIS_PORT}`);
    }
    catch (err) {
        logger_1.logger.warn(`Could not start embedded Redis server: ${err.message}`);
    }
};
exports.startEmbeddedRedisIfRequired = startEmbeddedRedisIfRequired;
const stopEmbeddedRedis = async () => {
    if (memoryServerInstance) {
        try {
            await memoryServerInstance.stop();
            logger_1.logger.info('Embedded Redis server stopped.');
        }
        catch (err) {
            logger_1.logger.error('Error stopping embedded Redis:', err);
        }
    }
};
exports.stopEmbeddedRedis = stopEmbeddedRedis;
//# sourceMappingURL=embeddedRedis.js.map