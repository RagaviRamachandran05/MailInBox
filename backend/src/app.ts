import express from 'express';
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
  origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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

// Mount API Routes
app.use('/api', apiRouter);

// Centralized error handling
app.use(errorHandler);

export default app;
