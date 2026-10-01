import { Router } from "express";
import { sendContactMessage } from "../controllers/contact.controller.js";
import { contactValidator } from "../validators/contact.validator.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "You've sent several messages already. Please wait a while before sending another.",
});

router.post("/", contactLimiter, contactValidator, sendContactMessage);

export default router;
