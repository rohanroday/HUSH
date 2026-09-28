import {Router} from "express";
import authenticate from "../middleware/auth.middleware.js";
import {addToCart,removeProductFromCart,getCart} from "../controllers/cart.controller.js";
import { addToCartValidator, removeCartValidator } from "../validators/cart.validator.js";


const router = Router();

router.use(authenticate);
router.post("/add/product/:productId",addToCartValidator,addToCart);
router.delete("/remove/product/:productId",removeCartValidator,removeProductFromCart);

router.get("/",getCart)

export default router;
