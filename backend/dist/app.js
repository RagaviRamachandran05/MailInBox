"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const queueController_1 = require("./controllers/queueController");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
// Security Middlewares
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Allows Bull Board frontend to render seamlessly
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: [env_1.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware
app.use((req, res, next) => {
    if (!req.path.startsWith('/admin/queues')) {
        logger_1.logger.debug(`${req.method} ${req.path}`);
    }
    next();
});
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        env: env_1.env.NODE_ENV,
        concurrency: env_1.env.WORKER_CONCURRENCY,
        minDelayMs: env_1.env.MIN_EMAIL_DELAY_MS,
        maxEmailsPerHour: env_1.env.MAX_EMAILS_PER_HOUR,
    });
});
// Mount Bull Board live monitoring dashboard
app.use('/admin/queues', queueController_1.bullBoardRouter);
// Mount API Routes
app.use('/api', routes_1.default);
// Centralized error handling
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map