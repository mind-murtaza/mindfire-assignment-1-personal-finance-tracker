const router = require("express").Router();
const { auth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { z } = require("zod");
const userController = require("../../controllers/user.controller");
const {
	userProfileSchema,
	userSettingsSchema,
} = require("../../schemas/user.schema");
const { passwordSchema } = require("../../schemas/common.schema");

// Use existing schemas from user.schema.js (DRY principle)
const profileUpdateSchema = userProfileSchema.partial().refine((data) => {
	return Object.keys(data).length > 0;
}, "At least one field is required"); // Allow partial updates

// Use existing schemas from user.schema.js (DRY principle)
const settingsUpdateSchema = userSettingsSchema.partial().refine((data) => {
	return Object.keys(data).length > 0;
}, "At least one field is required"); // Allow partial updates

// Password change schema using existing passwordSchema from common.schema.js
const changePasswordSchema = z
	.object({
		currentPassword: passwordSchema,
		newPassword: passwordSchema,
	})
	.strict();

// Protected user routes - all require authentication
router.use(auth);

router.get("/me", userController.me);
router.patch( "/me/profile", validate(profileUpdateSchema), userController.updateProfile
);

router.patch( "/me/settings", validate(settingsUpdateSchema), userController.updateSettings
);

router.post( "/me/change-password", validate(changePasswordSchema), userController.changePassword
);
router.delete("/me", userController.softDelete);

module.exports = router;
