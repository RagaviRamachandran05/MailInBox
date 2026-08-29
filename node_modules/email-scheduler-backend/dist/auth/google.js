"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleUserFromCode = exports.getGoogleAuthUrl = exports.getGoogleOAuthClient = void 0;
const google_auth_library_1 = require("google-auth-library");
const env_1 = require("../config/env");
let oauth2Client = null;
const getGoogleOAuthClient = () => {
    if (!oauth2Client) {
        oauth2Client = new google_auth_library_1.OAuth2Client(env_1.env.GOOGLE_CLIENT_ID, env_1.env.GOOGLE_CLIENT_SECRET, env_1.env.GOOGLE_CALLBACK_URL);
    }
    return oauth2Client;
};
exports.getGoogleOAuthClient = getGoogleOAuthClient;
const getGoogleAuthUrl = () => {
    const client = (0, exports.getGoogleOAuthClient)();
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
    });
};
exports.getGoogleAuthUrl = getGoogleAuthUrl;
const getGoogleUserFromCode = async (code) => {
    const client = (0, exports.getGoogleOAuthClient)();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env_1.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
        throw new Error('Google authentication failed: Missing profile email.');
    }
    return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture || null,
    };
};
exports.getGoogleUserFromCode = getGoogleUserFromCode;
//# sourceMappingURL=google.js.map