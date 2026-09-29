import { Router } from "express";
import { param } from "express-validator";
import authenticate from "../middleware/auth.middleware.js";
import { validateRequest } from "../utils/validate.js";
import { getNotifications, markAllRead, markRead } from "../controllers/notification.controller.js";

const router = Router();

router.use(authenticate);
router.get("/", getNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", param("id").isMongoId().withMessage("Invalid notification ID"), validateRequest, markRead);

export default router;
