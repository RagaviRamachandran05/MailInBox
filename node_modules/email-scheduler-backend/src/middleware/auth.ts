import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../auth/jwt';
import { prisma } from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { id: string };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication token is required.',
      code: 'AUTH_UNAUTHORIZED',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token.',
      code: 'AUTH_INVALID_TOKEN',
    });
  }

  // Optionally verify user exists in DB
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User account no longer exists.',
      code: 'AUTH_USER_NOT_FOUND',
    });
  }

  req.user = {
    id: user.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  };

  next();
};
