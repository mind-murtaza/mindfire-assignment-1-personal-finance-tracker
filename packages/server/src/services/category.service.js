const { Category } = require("../models");
const { z } = require("zod");
const { categoryTypeSchema } = require("../schemas/common.schema");
const {
	parentCategoryValidationSchema,
	categoryUniquenessSchema,
} = require("../schemas/category.schema");

// =================================================================
//                    BUSINESS LOGIC VALIDATION
// =================================================================

/**
 * Validate parent category relationship and depth
 */
const validateParentCategory = async (userId, type, parentId) => {
	if (!parentId) return; // No parent is valid

	// Check if parent exists and belongs to user
	const parent = await Category.findOne({ _id: parentId, userId });
	if (!parent) {
		const error = new Error('Parent category not found');
		error.status = 400;
		throw error;
	}

	// Ensure parent is same type
	if (parent.type !== type) {
		const error = new Error('Parent category must be of the same type');
		error.status = 400;
		throw error;
	}

	// Calculate parent depth (max 3 levels: Root → Child → Grandchild)
	let currentDepth = 0;
	let currentParent = parent;

	while (currentParent && currentParent.parentId) {
		currentDepth++;
		if (currentDepth >= 2) {
			const error = new Error('Maximum 3 levels allowed');
			error.status = 400;
			throw error;
		}
		currentParent = await Category.findById(currentParent.parentId);
	}

	// Validate using schema
	const validation = parentCategoryValidationSchema.safeParse({
		userId,
		type,
		parentId,
		exists: true,
		depth: currentDepth
	});

	if (!validation.success) {
		const error = new Error(validation.error.issues[0].message);
		error.status = 400;
		throw error;
	}
};

/**
 * Validate category name uniqueness
 */
const validateCategoryUniqueness = async (userId, type, name, categoryId = null) => {
	// Validate input using schema
	const validation = categoryUniquenessSchema.safeParse({
		userId,
		type,
		name
	});

	if (!validation.success) {
		const error = new Error(validation.error.issues[0].message);
		error.status = 400;
		throw error;
	}

	const query = { name, type, userId, isDeleted: false };

	if (categoryId) {
		query._id = { $ne: categoryId };
	}

	const existingCategory = await Category.findOne(query);
	if (existingCategory) {
		const error = new Error(`Category name '${name}' already exists for this type`);
		error.status = 400;
		throw error;
	}
};

/**
 * Handle default category logic
 */
const handleDefaultCategory = async (userId, type, isDefault, categoryId = null) => {
	if (!isDefault) return;

	if (categoryId) {
		await Category.updateOne(
			{ _id: categoryId },
			{ $set: { isDefault: false } }
		);
	} else {
	await Category.updateOne(
		{
			userId,
			type,
			isDefault: true
		},
		{ $set: { isDefault: false } },
		);
	}
};

// =================================================================
//                    CRUD OPERATIONS
// =================================================================

const createCategory = async (userId, categoryData) => {
	// Business logic validations
	await validateParentCategory(userId, categoryData.type, categoryData.parentId);
	await validateCategoryUniqueness(userId, categoryData.type, categoryData.name);
	await handleDefaultCategory(userId, categoryData.type, categoryData.isDefault);

	const category = new Category({
		...categoryData,
		userId,
	});

	// Create and save category
	await category.save();
	return category;
};

const getCategories = async (userId, query) => {
	const { type } = z
		.object({ type: categoryTypeSchema.optional() })
		.parse(query);
	return Category.findByUserAndType(userId, type);
};

const getCategoryHierarchy = async (userId, type) => {
	const validatedType = categoryTypeSchema.optional().parse(type);
	return Category.getCategoryHierarchy(userId, validatedType);
};

const getCategoryById = async (userId, categoryId) => {
	const category = await Category.findOne({ _id: categoryId, userId });
	if (!category) {
		const error = new Error("Category not found");
		error.status = 404;
		throw error;
	}
	return category;
};

const updateCategory = async (userId, categoryId, updateData) => {
	// Get existing category first
	const category = await getCategoryById(userId, categoryId);
	
	// Business logic validations
	if (updateData.name) {
		await validateCategoryUniqueness(userId, category.type, updateData.name, categoryId);
	}

	if (updateData.isDefault !== undefined) {
		await handleDefaultCategory(userId, category.type, updateData.isDefault, categoryId);
	}

	// Prevent forbidden updates (these should not come from API but double-check)
	if (updateData.hasOwnProperty('userId') || updateData.hasOwnProperty('type') || updateData.hasOwnProperty('parentId')) {
		const error = new Error('Cannot update userId, type, or parentId');
		error.status = 400;
		throw error;
	}

	// Apply updates and save
	Object.assign(category, updateData);
	await category.save();
	return category;
};

const deleteCategory = async (userId, categoryId) => {
	const category = await getCategoryById(userId, categoryId);
	await category.softDelete();
};

// =================================================================
//                    DEFAULT CATEGORY MANAGEMENT
// =================================================================

const setDefaultCategory = async (userId, categoryId) => {
	return Category.setDefaultCategory(userId, categoryId);
};

module.exports = {
	createCategory,
	getCategories,
	getCategoryHierarchy,
	getCategoryById,
	updateCategory,
	deleteCategory,
	setDefaultCategory,
};
