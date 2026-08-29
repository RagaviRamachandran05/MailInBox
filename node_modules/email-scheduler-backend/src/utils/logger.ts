import winston from 'winston';
import { env } from '../config/env';

// Redact sensitive patterns
const sanitizeFormat = winston.format((info) => {
  const SENSITIVE_KEYS = ['password', 'secret', 'token', 'accessToken', 'refreshToken', 'authorization', 'etherealPassword', 'clientSecret'];
  
  const sanitize = (val: any): any => {
    if (!val || typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(sanitize);
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEYS.some(sk => k.toLowerCase().includes(sk.toLowerCase()))) {
        val[k] = '***REDACTED***';
      } else if (typeof v === 'object' && v !== null) {
        sanitize(v);
      }
    }
    return val;
  };

  sanitize(info);
  return info;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    sanitizeFormat(),
    env.NODE_ENV === 'development'
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `[${timestamp}] ${level}: ${message}${metaStr}`;
          })
        )
      : winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});
