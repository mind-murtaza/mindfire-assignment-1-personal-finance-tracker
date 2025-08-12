const router = require('express').Router();
const { validate } = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const { z } = require('zod');
const authController = require('../../controllers/auth.controller');
const { createUserSchema } = require('../../schemas/user.schema');
const {
    emailSchema,
    passwordSchema,
  } = require('../../schemas/common.schema');


const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
}).strict();

router.post('/register', validate(createUserSchema), (err, req, res, next) => {
  if (err && err.name === 'ZodError') {
    return res.status(400).json({ success: false, error: err.issues?.[0]?.message || 'Invalid registration payload' });
  }
  return next(err);
}, authController.register);

router.post('/login', validate(loginSchema), (err, req, res, next) => {
  if (err && err.name === 'ZodError') {
    return res.status(400).json({ success: false, error: err.issues?.[0]?.message || 'Invalid login payload' });
  }
  return next(err);
}, authController.login);
router.post('/refresh', auth, authController.refresh);

module.exports = router;
