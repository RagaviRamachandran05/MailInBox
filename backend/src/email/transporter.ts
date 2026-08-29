import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let defaultTransporter: nodemailer.Transporter | null = null;
let defaultAccount: { user: string; pass: string } | null = null;

const FALLBACK_ETHEREAL = {
  user: 'ragavi.mailinbox@ethereal.email',
  pass: 'AuraMailPass2026!',
};

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
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
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
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
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
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
      });
    }
    return { transporter: defaultTransporter, senderEmail: env.ETHEREAL_USER };
  }

  // 4. Automatically provision or use instant fallback
  if (!defaultTransporter || !defaultAccount) {
    try {
      const testAccountPromise = nodemailer.createTestAccount();
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      const testAccount: any = await Promise.race([testAccountPromise, timeoutPromise]);

      if (testAccount && testAccount.user) {
        defaultAccount = {
          user: testAccount.user,
          pass: testAccount.pass,
        };
      } else {
        defaultAccount = FALLBACK_ETHEREAL;
      }
    } catch (e) {
      defaultAccount = FALLBACK_ETHEREAL;
    }

    defaultTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: defaultAccount.user,
        pass: defaultAccount.pass,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    });
  }

  return { transporter: defaultTransporter, senderEmail: defaultAccount.user };
};

export const getPreviewUrl = (info: nodemailer.SentMessageInfo): string | false => {
  const url = nodemailer.getTestMessageUrl(info);
  if (url) return url;
  if (info && info.messageId) {
    const cleanId = String(info.messageId).replace(/[<>]/g, '');
    return `https://ethereal.email/message/${cleanId}`;
  }
  return false;
};
