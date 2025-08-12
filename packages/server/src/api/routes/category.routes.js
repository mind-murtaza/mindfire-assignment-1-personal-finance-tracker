const router = require("express").Router();
const { auth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const {
	createCategorySchema,
	updateCategorySchema,
} = require("../../schemas/category.schema");
const categoryController = require("../../controllers/category.controller");

const { z } = require("zod");
const { objectIdSchema } = require("../../schemas/common.schema");
const idParamSchema = z.object({ id: objectIdSchema });
// =================================================================
//                     CATEGORY API ROUTES
// =================================================================

// All routes are protected by auth middleware
router.use(auth);

router.post(
  "/",
  validate(createCategorySchema),
  (err, req, res, next) => {
    // Local validation error safety net
    if (err && err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.issues?.[0]?.message || 'Invalid category payload' });
    }
    return next(err);
  },
  categoryController.createCategory
);
router.get("/", categoryController.getCategories);

router.get("/hierarchy", categoryController.getCategoryHierarchy);

router.get(
  "/:id",
  validate(idParamSchema, "params"),
  (err, req, res, next) => {
    if (err && err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Invalid category id' });
    }
    return next(err);
  },
  categoryController.getCategory
);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateCategorySchema),
  (err, req, res, next) => {
    if (err && err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.issues?.[0]?.message || 'Invalid update payload' });
    }
    return next(err);
  },
  categoryController.updateCategory
);
router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  (err, req, res, next) => {
    if (err && err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Invalid category id' });
    }
    return next(err);
  },
  categoryController.deleteCategory
);

router.patch(
  "/:id/set-default",
  validate(idParamSchema, "params"),
  (err, req, res, next) => {
    if (err && err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Invalid category id' });
    }
    return next(err);
  },
  categoryController.setDefaultCategory
);

module.exports = router;
