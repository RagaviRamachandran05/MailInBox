import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import apiRouter from './routes';
import { bullBoardRouter } from './controllers/queueController';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allows Bull Board frontend to render seamlessly
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin, localhost, vercel.app, or configured FRONTEND_URL
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('vercel.app') || origin === env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  if (!req.path.startsWith('/admin/queues')) {
    logger.debug(`${req.method} ${req.path}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    concurrency: env.WORKER_CONCURRENCY,
    minDelayMs: env.MIN_EMAIL_DELAY_MS,
    maxEmailsPerHour: env.MAX_EMAILS_PER_HOUR,
  });
});

// Mount Bull Board live monitoring dashboard
app.use('/admin/queues', bullBoardRouter);

import fs from 'fs';

// Mount API Routes
app.use('/api', apiRouter);

// Robust static frontend serving across all deployment environments
const candidatePaths = [
  path.join(__dirname, 'public'),
  path.join(__dirname, '../public'),
  path.join(__dirname, '../../frontend/dist'),
  path.join(process.cwd(), 'frontend/dist'),
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), '../frontend/dist'),
];

let frontendDist: string | null = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    frontendDist = p;
    break;
  }
}

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
      return next();
    }
    res.sendFile(path.join(frontendDist!, 'index.html'));
  });
}

// Centralized error handling
app.use(errorHandler);

export default app;
