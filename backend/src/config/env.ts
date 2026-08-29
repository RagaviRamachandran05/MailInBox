import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(val => parseInt(val, 10)),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  SESSION_SECRET: z.string().default('super_secure_jwt_session_secret_reachinbox_2026_x991'),
  
  DATABASE_URL: z.string().default('file:./dev.db'),
  
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(val => parseInt(val, 10)),
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
  SMTP_PORT: z.string().default('587').transform(val => parseInt(val, 10)),
  SMTP_SECURE: z.string().default('false').transform(val => val === 'true'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  
  WORKER_CONCURRENCY: z.string().default('5').transform(val => parseInt(val, 10)),
  MIN_EMAIL_DELAY_MS: z.string().default('2000').transform(val => parseInt(val, 10)),
  MAX_EMAILS_PER_HOUR: z.string().default('200').transform(val => parseInt(val, 10)),
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
