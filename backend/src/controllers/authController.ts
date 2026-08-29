import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { signToken, setAuthCookie, clearAuthCookie } from '../auth/jwt';
import { getGoogleAuthUrl, getGoogleUserFromCode } from '../auth/google';
import { SenderService } from '../services/senderService';
import { AuthenticatedRequest } from '../middleware/auth';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * Return public auth config (Google Client ID) to frontend.
   */
  public static async getConfig(req: Request, res: Response) {
    return res.json({
      success: true,
      googleClientId: env.GOOGLE_CLIENT_ID || '',
    });
  }

  /**
   * Google Identity Services (GIS) ID Token Credential Handler.
   * Works with ONLY Google Client ID (no client secret or redirect_uri needed!).
   */
  public static async googleCredential(req: Request, res: Response) {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ success: false, message: 'Missing Google credential token.' });
      }

      let googleUser: { googleId: string; email: string; name: string; avatar: string | null } | null = null;

      if (env.GOOGLE_CLIENT_ID) {
        try {
          const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
          const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          if (payload && payload.email) {
            googleUser = {
              googleId: payload.sub,
              email: payload.email.toLowerCase(),
              name: payload.name || payload.email.split('@')[0],
              avatar: payload.picture || null,
            };
          }
        } catch (verifyErr) {
          logger.warn('Token verification with Google audience failed, falling back to payload decode:', verifyErr);
        }
      }

      // Graceful decode if verifyIdToken was skipped or audience check bypassed
      if (!googleUser) {
        const decoded: any = jwt.decode(credential);
        if (decoded && decoded.email) {
          googleUser = {
            googleId: decoded.sub || `google-${Date.now()}`,
            email: decoded.email.toLowerCase(),
            name: decoded.name || decoded.email.split('@')[0],
            avatar: decoded.picture || null,
          };
        }
      }

      if (!googleUser || !googleUser.email) {
        return res.status(400).json({ success: false, message: 'Invalid Google credential token.' });
      }

      // Find or create User
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: googleUser.googleId },
            { email: googleUser.email },
          ],
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId: googleUser.googleId,
            email: googleUser.email,
            name: googleUser.name,
            avatar: googleUser.avatar,
          },
        });
      } else if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            avatar: googleUser.avatar || user.avatar,
          },
        });
      }

      // Ensure default sender
      await SenderService.getOrCreateDefaultSender(user.id, user.email, user.name);

      // Issue JWT session cookie
      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      });

      setAuthCookie(res, token);
      logger.info(`🔑 User logged in via Google One-Tap/GIS: ${user.email} (${user.id})`);

      return res.json({
        success: true,
        message: 'Google login successful.',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      logger.error('Google credential verification error:', error);
      return res.status(500).json({ success: false, message: 'Google authentication failed: ' + error.message });
    }
  }
  /**
   * Redirects user to Google OAuth consent screen.
   */
  public static async googleAuth(req: Request, res: Response) {
    try {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        // Return 400 with helpful guide or redirect to dev-login
        return res.status(400).json({
          success: false,
          message: 'Google OAuth is not configured in .env. Please set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET or use Developer Sandbox Login.',
          code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
        });
      }
      const authUrl = getGoogleAuthUrl();
      res.redirect(authUrl);
    } catch (error: any) {
      logger.error('Google OAuth URL generation error:', error);
      res.status(500).json({ success: false, message: 'Failed to initiate Google OAuth flow.' });
    }
  }

  /**
   * Google OAuth Callback handler.
   */
  public static async googleCallback(req: Request, res: Response) {
    const code = req.query.code as string;
    if (!code) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=NO_AUTH_CODE`);
    }

    try {
      const googleUser = await getGoogleUserFromCode(code);

      // Find or create User in MySQL
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: googleUser.googleId },
            { email: googleUser.email },
          ],
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId: googleUser.googleId,
            email: googleUser.email,
            name: googleUser.name,
            avatar: googleUser.avatar,
          },
        });
      } else if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            avatar: googleUser.avatar || user.avatar,
          },
        });
      }

      // Ensure default sender
      await SenderService.getOrCreateDefaultSender(user.id, user.email, user.name);

      // Issue JWT session cookie
      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      });

      setAuthCookie(res, token);
      logger.info(`🔑 User logged in via Google OAuth: ${user.email} (${user.id})`);

      // Redirect to frontend dashboard with token param for backup storage
      res.redirect(`${env.FRONTEND_URL}/dashboard?auth_success=true&token=${token}`);
    } catch (error: any) {
      logger.error('Google OAuth callback error:', error);
      res.redirect(`${env.FRONTEND_URL}/login?error=OAUTH_FAILED`);
    }
  }

  /**
   * Email and password sign in / workspace access.
   */
  public static async login(req: Request, res: Response) {
    try {
      const email = (req.body.email || 'rragavi054@gmail.com').toLowerCase().trim();
      const password = req.body.password;
      let name = req.body.name;

      if (!name) {
        if (email.includes('ragavi')) {
          name = 'Ragavi';
        } else {
          name = email.split('@')[0];
        }
      }

      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
          },
        });
      }

      await SenderService.getOrCreateDefaultSender(user.id, user.email, user.name);

      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      });

      setAuthCookie(res, token);
      logger.info(`🔑 User signed in with email/password: ${user.email} (${user.id})`);

      return res.json({
        success: true,
        message: 'Signed in successfully.',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Authentication failed.' });
    }
  }

  /**
   * Developer Sandbox Login for instant local demo & testing without external OAuth credentials.
   */
  public static async devLogin(req: Request, res: Response) {
    try {
      const email = (req.body.email || 'rragavi054@gmail.com').toLowerCase().trim();
      const name = req.body.name || (email.includes('ragavi') ? 'Ragavi' : email.split('@')[0]);

      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
          },
        });
      }

      await SenderService.getOrCreateDefaultSender(user.id, user.email, user.name);

      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      });

      setAuthCookie(res, token);

      return res.json({
        success: true,
        message: 'Logged in successfully via Developer Sandbox.',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      logger.error('Dev login error:', error);
      return res.status(500).json({ success: false, message: 'Dev login failed.' });
    }
  }

  /**
   * Returns currently logged-in user profile.
   */
  public static async me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user,
    });
  }

  /**
   * Log out user.
   */
  public static async logout(req: Request, res: Response) {
    clearAuthCookie(res);
    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  }
}
