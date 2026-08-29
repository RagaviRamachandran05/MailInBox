"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Valid email is required'),
    password: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
});
router.get('/config', authController_1.AuthController.getConfig);
router.post('/google/credential', authController_1.AuthController.googleCredential);
router.get('/google', authController_1.AuthController.googleAuth);
router.get('/google/callback', authController_1.AuthController.googleCallback);
router.post('/login', (0, validate_1.validateRequest)({ body: loginSchema }), authController_1.AuthController.login);
router.post('/dev-login', (0, validate_1.validateRequest)({ body: loginSchema }), authController_1.AuthController.devLogin);
router.get('/me', auth_1.requireAuth, authController_1.AuthController.me);
router.post('/logout', authController_1.AuthController.logout);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map