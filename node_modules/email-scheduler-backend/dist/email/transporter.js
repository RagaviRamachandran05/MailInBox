"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreviewUrl = exports.getOrCreateEtherealTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
let defaultTransporter = null;
let defaultAccount = null;
const getOrCreateEtherealTransporter = async (customUser, customPass) => {
    // 1. If custom sender SMTP credentials provided
    if (customUser && customPass) {
        const isRealSmtp = env_1.env.SMTP_HOST && env_1.env.SMTP_HOST !== 'smtp.ethereal.email';
        const transporter = nodemailer_1.default.createTransport({
            host: isRealSmtp ? env_1.env.SMTP_HOST : 'smtp.ethereal.email',
            port: isRealSmtp ? env_1.env.SMTP_PORT : 587,
            secure: isRealSmtp ? env_1.env.SMTP_SECURE : false,
            auth: {
                user: customUser,
                pass: customPass,
            },
        });
        return { transporter, senderEmail: customUser };
    }
    // 2. If Real SMTP Server configured in .env (e.g. Gmail, SendGrid, Resend, Mailgun)
    if (env_1.env.SMTP_HOST && env_1.env.SMTP_USER && env_1.env.SMTP_PASSWORD) {
        if (!defaultTransporter) {
            defaultTransporter = nodemailer_1.default.createTransport({
                host: env_1.env.SMTP_HOST,
                port: env_1.env.SMTP_PORT,
                secure: env_1.env.SMTP_SECURE,
                auth: {
                    user: env_1.env.SMTP_USER,
                    pass: env_1.env.SMTP_PASSWORD,
                },
            });
            logger_1.logger.info(`🚀 Real Live SMTP Server Active: ${env_1.env.SMTP_HOST} (Sending from: ${env_1.env.SMTP_USER})`);
        }
        return { transporter: defaultTransporter, senderEmail: env_1.env.SMTP_USER };
    }
    // 3. If Ethereal test account configured in .env
    if (env_1.env.ETHEREAL_USER && env_1.env.ETHEREAL_PASSWORD) {
        if (!defaultTransporter) {
            defaultTransporter = nodemailer_1.default.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: env_1.env.ETHEREAL_USER,
                    pass: env_1.env.ETHEREAL_PASSWORD,
                },
            });
            logger_1.logger.info(`📧 Using configured Ethereal SMTP account: ${env_1.env.ETHEREAL_USER}`);
        }
        return { transporter: defaultTransporter, senderEmail: env_1.env.ETHEREAL_USER };
    }
    // 4. Automatically provision dynamic Ethereal test account if none configured
    if (!defaultTransporter || !defaultAccount) {
        logger_1.logger.info('⚙️ No SMTP credentials provided in .env. Provisioning Ethereal test sandbox...');
        const testAccount = await nodemailer_1.default.createTestAccount();
        defaultAccount = {
            user: testAccount.user,
            pass: testAccount.pass,
        };
        defaultTransporter = nodemailer_1.default.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        logger_1.logger.info(`✅ Auto-provisioned Ethereal account: ${testAccount.user}`);
    }
    return { transporter: defaultTransporter, senderEmail: defaultAccount.user };
};
exports.getOrCreateEtherealTransporter = getOrCreateEtherealTransporter;
const getPreviewUrl = (info) => {
    return nodemailer_1.default.getTestMessageUrl(info);
};
exports.getPreviewUrl = getPreviewUrl;
//# sourceMappingURL=transporter.js.map