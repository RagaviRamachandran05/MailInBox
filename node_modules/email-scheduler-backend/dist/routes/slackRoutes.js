"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const slackController_1 = require("../controllers/slackController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/callback', slackController_1.SlackController.callback);
router.use(auth_1.requireAuth);
router.get('/connect', slackController_1.SlackController.connect);
router.get('/status', slackController_1.SlackController.getStatus);
router.post('/test', slackController_1.SlackController.test);
router.post('/disconnect', slackController_1.SlackController.disconnect);
exports.default = router;
//# sourceMappingURL=slackRoutes.js.map