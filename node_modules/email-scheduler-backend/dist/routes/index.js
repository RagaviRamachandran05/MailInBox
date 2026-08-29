"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const emailRoutes_1 = __importDefault(require("./emailRoutes"));
const slackRoutes_1 = __importDefault(require("./slackRoutes"));
const senderRoutes_1 = __importDefault(require("./senderRoutes"));
const queueRoutes_1 = __importDefault(require("./queueRoutes"));
const router = (0, express_1.Router)();
router.use('/auth', authRoutes_1.default);
router.use('/emails', emailRoutes_1.default);
router.use('/slack', slackRoutes_1.default);
router.use('/senders', senderRoutes_1.default);
router.use('/queue', queueRoutes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map