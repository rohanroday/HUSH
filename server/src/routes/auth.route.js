import Router from 'express';
import {registerUser,loginUser,getMe,changePassword} from '../controllers/auth.controller.js';
import { registerValidator,loginValidator,changePasswordValidator } from '../validators/auth.validator.js';
import authenticate from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

const router= Router();

// slow down password guessing and bulk sign-ups
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many attempts. Please wait a few minutes and try again.' });

router.post('/register',authLimiter,registerValidator,registerUser);
router.post('/login',authLimiter,loginValidator,loginUser);
router.get('/me',authenticate,getMe);
router.patch('/password',authenticate,authLimiter,changePasswordValidator,changePassword);

export default router;
