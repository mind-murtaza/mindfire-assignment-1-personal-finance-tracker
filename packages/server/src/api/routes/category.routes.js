const router = require("express").Router();
const { auth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const {
	createCategorySchema,
	updateCategorySchema,
	listCategoriesQuerySchema,
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
	categoryController.createCategory
);
router.get(
	"/",
	validate(listCategoriesQuerySchema, "query"),
	categoryController.getCategories
);

router.get(
	"/hierarchy",
	validate(listCategoriesQuerySchema, "query"),
	categoryController.getCategoryHierarchy
);

router.get(
	"/:id",
	validate(idParamSchema, "params"),
	categoryController.getCategory
);
router.patch(
	"/:id",
	validate(idParamSchema, "params"),
	validate(updateCategorySchema),
	categoryController.updateCategory
);
router.delete(
	"/:id",
	validate(idParamSchema, "params"),
	categoryController.deleteCategory
);

router.patch(
	"/:id/set-default",
	validate(idParamSchema, "params"),
	categoryController.setDefaultCategory
);

module.exports = router;
