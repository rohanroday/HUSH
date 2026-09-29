import {Router} from "express";
import { getOrders,getSellerOrders,cancelOrder,updateOrderStatus,requestCancellation,respondToCancellation } from "../controllers/order.controller.js";
import { requestCancellationValidator, respondCancellationValidator } from "../validators/cancellation.validator.js";
import authenticate from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
// Orders are created through /api/payments/checkout once they're paid for.
router.get("/",getOrders);
router.get("/seller",getSellerOrders);
router.patch("/cancel/:orderId",cancelOrder);

router.patch("/status/:orderId",updateOrderStatus);

// shipped orders: the buyer asks, a seller approves (cancel + refund) or declines
router.post("/cancel-request/:orderId",requestCancellationValidator,requestCancellation);
router.patch("/cancel-request/:orderId",respondCancellationValidator,respondToCancellation);


export default router;
