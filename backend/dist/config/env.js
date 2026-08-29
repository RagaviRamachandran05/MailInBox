"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('5000').transform(val => parseInt(val, 10)),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:5173'),
    SESSION_SECRET: zod_1.z.string().default('super_secure_jwt_session_secret_reachinbox_2026_x991'),
    DATABASE_URL: zod_1.z.string().default('file:./dev.db'),
    REDIS_HOST: zod_1.z.string().default('localhost'),
    REDIS_PORT: zod_1.z.string().default('6379').transform(val => parseInt(val, 10)),
    REDIS_PASSWORD: zod_1.z.string().optional().default(''),
    ELASTICSEARCH_URL: zod_1.z.string().default('http://localhost:9200'),
    GOOGLE_CLIENT_ID: zod_1.z.string().optional().default(''),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional().default(''),
    GOOGLE_CALLBACK_URL: zod_1.z.string().default('http://localhost:5000/api/auth/google/callback'),
    SLACK_CLIENT_ID: zod_1.z.string().optional().default(''),
    SLACK_CLIENT_SECRET: zod_1.z.string().optional().default(''),
    SLACK_REDIRECT_URI: zod_1.z.string().default('http://localhost:5000/api/slack/callback'),
    SLACK_WEBHOOK_URL: zod_1.z.string().optional().default(''),
    ETHEREAL_USER: zod_1.z.string().optional().default(''),
    ETHEREAL_PASSWORD: zod_1.z.string().optional().default(''),
    // Real Live SMTP Configuration (Optional - for sending to real Gmail/Outlook inboxes)
    SMTP_HOST: zod_1.z.string().optional().default(''),
    SMTP_PORT: zod_1.z.string().default('587').transform(val => parseInt(val, 10)),
    SMTP_SECURE: zod_1.z.string().default('false').transform(val => val === 'true'),
    SMTP_USER: zod_1.z.string().optional().default(''),
    SMTP_PASSWORD: zod_1.z.string().optional().default(''),
    WORKER_CONCURRENCY: zod_1.z.string().default('5').transform(val => parseInt(val, 10)),
    MIN_EMAIL_DELAY_MS: zod_1.z.string().default('2000').transform(val => parseInt(val, 10)),
    MAX_EMAILS_PER_HOUR: zod_1.z.string().default('200').transform(val => parseInt(val, 10)),
});
const parseEnv = () => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables configuration:', result.error.format());
        // In dev, use defaults where possible
        return envSchema.parse({});
    }
    return result.data;
};
exports.env = parseEnv();
//# sourceMappingURL=env.js.map