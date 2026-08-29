"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body);
            }
            if (schema.query) {
                req.query = await schema.query.parseAsync(req.query);
            }
            if (schema.params) {
                req.params = await schema.params.parseAsync(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
                    code: 'VALIDATION_ERROR',
                    errors: error.errors,
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid request data format.',
                code: 'VALIDATION_ERROR',
            });
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validate.js.map