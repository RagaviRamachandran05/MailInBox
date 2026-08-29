"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("../config/env");
// Redact sensitive patterns
const sanitizeFormat = winston_1.default.format((info) => {
    const SENSITIVE_KEYS = ['password', 'secret', 'token', 'accessToken', 'refreshToken', 'authorization', 'etherealPassword', 'clientSecret'];
    const sanitize = (val) => {
        if (!val || typeof val !== 'object')
            return val;
        if (Array.isArray(val))
            return val.map(sanitize);
        for (const [k, v] of Object.entries(val)) {
            if (SENSITIVE_KEYS.some(sk => k.toLowerCase().includes(sk.toLowerCase()))) {
                val[k] = '***REDACTED***';
            }
            else if (typeof v === 'object' && v !== null) {
                sanitize(v);
            }
        }
        return val;
    };
    sanitize(info);
    return info;
});
exports.logger = winston_1.default.createLogger({
    level: env_1.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), sanitizeFormat(), env_1.env.NODE_ENV === 'development'
        ? winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `[${timestamp}] ${level}: ${message}${metaStr}`;
        }))
        : winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console()
    ]
});
//# sourceMappingURL=logger.js.map