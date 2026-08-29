import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let defaultTransporter: nodemailer.Transporter | null = null;
let defaultAccount: { user: string; pass: string } | null = null;

export const getOrCreateEtherealTransporter = async (
  customUser?: string | null,
  customPass?: string | null
): Promise<{ transporter: nodemailer.Transporter; senderEmail: string }> => {
  // 1. If custom sender SMTP credentials provided
  if (customUser && customPass) {
    const isRealSmtp = env.SMTP_HOST && env.SMTP_HOST !== 'smtp.ethereal.email';
    const transporter = nodemailer.createTransport({
      host: isRealSmtp ? env.SMTP_HOST : 'smtp.ethereal.email',
      port: isRealSmtp ? env.SMTP_PORT : 587,
      secure: isRealSmtp ? env.SMTP_SECURE : false,
      auth: {
        user: customUser,
        pass: customPass,
      },
    });
    return { transporter, senderEmail: customUser };
  }

  // 2. If Real SMTP Server configured in .env (e.g. Gmail, SendGrid, Resend, Mailgun)
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) {
    if (!defaultTransporter) {
      defaultTransporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      });
      logger.info(`🚀 Real Live SMTP Server Active: ${env.SMTP_HOST} (Sending from: ${env.SMTP_USER})`);
    }
    return { transporter: defaultTransporter, senderEmail: env.SMTP_USER };
  }

  // 3. If Ethereal test account configured in .env
  if (env.ETHEREAL_USER && env.ETHEREAL_PASSWORD) {
    if (!defaultTransporter) {
      defaultTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: env.ETHEREAL_USER,
          pass: env.ETHEREAL_PASSWORD,
        },
      });
      logger.info(`📧 Using configured Ethereal SMTP account: ${env.ETHEREAL_USER}`);
    }
    return { transporter: defaultTransporter, senderEmail: env.ETHEREAL_USER };
  }

  // 4. Automatically provision dynamic Ethereal test account if none configured
  if (!defaultTransporter || !defaultAccount) {
    logger.info('⚙️ No SMTP credentials provided in .env. Provisioning Ethereal test sandbox...');
    const testAccount = await nodemailer.createTestAccount();
    defaultAccount = {
      user: testAccount.user,
      pass: testAccount.pass,
    };
    defaultTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.info(`✅ Auto-provisioned Ethereal account: ${testAccount.user}`);
  }

  return { transporter: defaultTransporter, senderEmail: defaultAccount.user };
};

export const getPreviewUrl = (info: nodemailer.SentMessageInfo): string | false => {
  return nodemailer.getTestMessageUrl(info);
};
