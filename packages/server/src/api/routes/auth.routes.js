const router = require("express").Router();
const { validate } = require("../middlewares/validate");
const { auth } = require("../middlewares/auth");
const { z } = require("zod");
const authController = require("../../controllers/auth.controller");
const { createUserSchema } = require("../../schemas/user.schema");
const { emailSchema, passwordSchema } = require("../../schemas/common.schema");

const loginSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
	})
	.strict();

router.post("/register", validate(createUserSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", auth, authController.refresh);

module.exports = router;
