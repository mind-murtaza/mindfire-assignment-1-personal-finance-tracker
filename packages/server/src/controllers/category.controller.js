const categoryService = require("../services/category.service");

// Centralized controller error normalization
function forwardCategoryError(err, next) {
  // Mongo duplicate key
  if (err && (err.code === 11000 || err.code === 11001)) {
    err.status = err.status || 409;
    err.message = err.message || "Category already exists";
    err.code = err.code || "DUPLICATE_CATEGORY";
  }
  // Explicit statusless errors default to 500
  if (!err.status) {
    err.status = 500;
    err.code = err.code || "CATEGORY_CONTROLLER_ERROR";
  }
  return next(err);
}

// =================================================================
//                    CRUD OPERATIONS
// =================================================================

const createCategory = async (req, res, next) => {
	try {
		const category = await categoryService.createCategory(req.user.id, req.body);
		res.status(201).json({
			success: true,
			data: category,
			message: "Category created successfully",
		});
  } catch (err) {
    forwardCategoryError(err, next);
  }
};

const getCategories = async (req, res, next) => {
	try {
		const categories = await categoryService.getCategories(
			req.user.id,
			req.query
		);
		res.json({
			success: true,
			data: categories,
			message: "Categories retrieved successfully",
		});
  } catch (err) {
    forwardCategoryError(err, next);
  }
};

const getCategoryHierarchy = async (req, res, next) => {
	try {
		const hierarchy = await categoryService.getCategoryHierarchy(
			req.user.id,
			req.query.type
		);
		res.json({
			success: true,
			data: hierarchy,
			message: "Category hierarchy retrieved successfully",
		});
  } catch (err) {
    forwardCategoryError(err, next);
  }
};

const getCategory = async (req, res, next) => {
	try {
		const category = await categoryService.getCategoryById(
			req.user.id,
			req.params.id
		);
		res.json({
			success: true,
			data: category,
			message: "Category retrieved successfully",
		});
  } catch (err) {
    forwardCategoryError(err, next);
  }
};

const updateCategory = async (req, res, next) => {
	try {
		const category = await categoryService.updateCategory(
			req.user.id,
			req.params.id,
			req.body
		);
		res.json({
			success: true,
			data: category,
			message: "Category updated successfully",
		});
  } catch (err) {
    forwardCategoryError(err, next);
  }
};

const deleteCategory = async (req, res, next) => {
	try {
		await categoryService.deleteCategory(req.user.id, req.params.id);
		res.status(204).send();
  } catch (err) {
    forwardCategoryError(err, next);
  }
};

// =================================================================
//                    DEFAULT CATEGORY MANAGEMENT
// =================================================================

const setDefaultCategory = async (req, res, next) => {
	try {
		const category = await categoryService.setDefaultCategory(
			req.user.id,
			req.params.id
		);
		res.json({
			success: true,
			data: category,
			message: "Default category set successfully",
		});
	} catch (err) {
		next(err);
	}
};

module.exports = {
	createCategory,
	getCategories,
	getCategoryHierarchy,
	getCategory,
	updateCategory,
	deleteCategory,
	setDefaultCategory,
};
