"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jwt_1 = require("../auth/jwt");
const prisma_1 = require("../config/prisma");
const requireAuth = async (req, res, next) => {
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
    const payload = (0, jwt_1.verifyToken)(token);
    if (!payload) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid or expired token.',
            code: 'AUTH_INVALID_TOKEN',
        });
    }
    // Optionally verify user exists in DB
    const user = await prisma_1.prisma.user.findUnique({
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
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map