import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.union([z.string(), z.number()]).default(10000).transform(val => Number(val)),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  SESSION_SECRET: z.string().default('super_secure_jwt_session_secret_reachinbox_2026_x991'),
  
  DATABASE_URL: z.string().default('file:./dev.db'),
  
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.union([z.string(), z.number()]).default(6379).transform(val => Number(val)),
  REDIS_PASSWORD: z.string().optional().default(''),
  
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),
  
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/auth/google/callback'),
  
  SLACK_CLIENT_ID: z.string().optional().default(''),
  SLACK_CLIENT_SECRET: z.string().optional().default(''),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:5000/api/slack/callback'),
  SLACK_WEBHOOK_URL: z.string().optional().default(''),
  
  ETHEREAL_USER: z.string().optional().default(''),
  ETHEREAL_PASSWORD: z.string().optional().default(''),
  
  // Real Live SMTP Configuration (Optional - for sending to real Gmail/Outlook inboxes)
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.union([z.string(), z.number()]).default(587).transform(val => Number(val)),
  SMTP_SECURE: z.union([z.string(), z.boolean()]).default(false).transform(val => val === true || val === 'true'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  
  WORKER_CONCURRENCY: z.union([z.string(), z.number()]).default(5).transform(val => Number(val)),
  MIN_EMAIL_DELAY_MS: z.union([z.string(), z.number()]).default(2000).transform(val => Number(val)),
  MAX_EMAILS_PER_HOUR: z.union([z.string(), z.number()]).default(200).transform(val => Number(val)),
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

export const env = parseEnv();
