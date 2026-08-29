"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emailController_1 = require("../controllers/emailController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const scheduleEmailSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1, 'Subject is required'),
    body: zod_1.z.string().min(1, 'Body is required'),
    recipients: zod_1.z.array(zod_1.z.string().email('Invalid email recipient')).min(1, 'At least one recipient is required'),
    startTime: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid ISO start time format',
    }),
    delayBetweenEmails: zod_1.z.number().int().positive('Delay must be a positive integer').optional(),
    hourlyLimit: zod_1.z.number().int().positive('Hourly limit must be a positive integer').optional(),
    senderId: zod_1.z.string().uuid().optional(),
});
const paginationSchema = zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    search: zod_1.z.string().optional(),
});
const searchSchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    status: zod_1.z.enum(['scheduled', 'processing', 'sent', 'failed']).optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
});
router.use(auth_1.requireAuth);
router.post('/schedule', (0, validate_1.validateRequest)({ body: scheduleEmailSchema }), emailController_1.EmailController.scheduleEmail);
router.get('/scheduled', (0, validate_1.validateRequest)({ query: paginationSchema }), emailController_1.EmailController.getScheduled);
router.get('/sent', (0, validate_1.validateRequest)({ query: paginationSchema }), emailController_1.EmailController.getSent);
router.get('/search', (0, validate_1.validateRequest)({ query: searchSchema }), emailController_1.EmailController.searchEmails);
router.get('/stats', emailController_1.EmailController.getStats);
router.get('/:id', emailController_1.EmailController.getById);
router.delete('/:id', emailController_1.EmailController.deleteEmail);
exports.default = router;
//# sourceMappingURL=emailRoutes.js.map