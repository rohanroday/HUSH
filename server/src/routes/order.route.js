import {Router} from "express";
import { createOrder,getOrders,getSellerOrders,cancelOrder,updateOrderStatus } from "../controllers/order.controller.js";
import authenticate from "../middleware/auth.middleware.js";
import {createOrderValidator} from "../validators/order.validator.js";

const router = Router();

router.use(authenticate);
router.post("/",createOrderValidator,createOrder);

router.get("/",getOrders);
router.get("/seller",getSellerOrders);
router.patch("/cancel/:orderId",cancelOrder);

router.patch("/status/:orderId",updateOrderStatus);


export default router;