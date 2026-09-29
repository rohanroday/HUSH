import { Router } from "express";
import authenticate from "../middleware/auth.middleware.js";
import { createOrderValidator } from "../validators/order.validator.js";
import { abandonCheckoutValidator, verifyPaymentValidator } from "../validators/payment.validator.js";
import { abandonCheckout, startCheckout, verifyPayment } from "../controllers/payment.controller.js";

const router = Router();

router.use(authenticate);
router.post("/checkout", createOrderValidator, startCheckout);
router.post("/verify", verifyPaymentValidator, verifyPayment);
router.post("/abandon/:orderId", abandonCheckoutValidator, abandonCheckout);

export default router;
