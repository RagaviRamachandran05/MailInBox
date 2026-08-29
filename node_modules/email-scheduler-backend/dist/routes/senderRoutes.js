"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const senderController_1 = require("../controllers/senderController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const createSenderSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Sender name is required'),
    email: zod_1.z.string().email('Valid sender email is required'),
    etherealUser: zod_1.z.string().optional(),
    etherealPassword: zod_1.z.string().optional(),
    hourlyLimit: zod_1.z.number().int().positive('Hourly limit must be positive').optional(),
    isDefault: zod_1.z.boolean().optional(),
});
router.use(auth_1.requireAuth);
router.get('/', senderController_1.SenderController.listSenders);
router.post('/', (0, validate_1.validateRequest)({ body: createSenderSchema }), senderController_1.SenderController.createSender);
router.delete('/:id', senderController_1.SenderController.deleteSender);
exports.default = router;
//# sourceMappingURL=senderRoutes.js.map