const router = require('express').Router();
const { validate } = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const { z } = require('zod');
const authController = require('../../controllers/auth.controller');
const { createUserSchema } = require('../../schemas/user.schema');
const {
    emailSchema,
    passwordSchema,
    forgotPasswordRequestSchema,
    resetPasswordRequestSchema,
    verifyEmailRequestSchema,
    requestOtpSchema,
    verifyOtpSchema
  } = require('../../schemas/common.schema');


const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
}).strict();

// Public routes (no authentication required)
router.post('/register', validate(createUserSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordRequestSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordRequestSchema), authController.resetPassword);
router.post('/verify-email', validate(verifyEmailRequestSchema), authController.verifyEmail);
router.post('/request-otp', validate(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

// Protected routes (authentication required)
router.post('/refresh', auth, authController.refresh);

module.exports = router;
