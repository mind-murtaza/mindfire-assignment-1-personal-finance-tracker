/**
 * Category Model - Enterprise-Grade Category Schema
 * Purpose: Stores user-defined and default categories for transactions
 *
 * Performance Optimizations:
 * - Compound index on userId + type for fast category queries
 * - Soft delete index for active category filtering
 * - Parent-child relationship support for sub-categories (3 levels max)
 *
 * Business Logic:
 * - Hierarchical categories (3 levels: Root → Child → Grandchild)
 * - Monthly budget tracking per category
 * - Soft delete support
 * - Default vs custom categories (one per user per type)
 *
 * Validation Strategy:
 * - All validation handled at service layer (API-first architecture)
 * - Model only handles data transformations and persistence
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

// =================================================================
//                    CATEGORY SCHEMA DEFINITION
// =================================================================

const CategorySchema = new Schema(
	{
		// Owner reference
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},

		// Category identification
		name: {
			type: String,
			trim: true,
		},

		// Transaction type classification
		type: {
			type: String,
		},

		// Hierarchical structure support (3 levels max)
		parentId: {
			type: Schema.Types.ObjectId,
			ref: "Category",
			default: null,
		},

		// UI customization
		color: {
			type: String,
			default: "#CCCCCC",
		},

		icon: {
			type: String,
			default: "tag",
		},

		// System vs user categories
		isDefault: {
			type: Boolean,
			default: false,
		},

		// Budget management
		monthlyBudget: {
			type: Schema.Types.Decimal128,
			default: 0.0,
		},

		// Soft delete fields
		isDeleted: {
			type: Boolean,
			default: false,
		},

		deletedAt: {
			type: Date,
			default: null,
		},
	},
	{
		// Schema options
		timestamps: true,
		collection: "categories",
		minimize: false,
		validateBeforeSave: true,

		// JSON transformation
		toJSON: {
			transform: function (doc, ret) {
				if (ret.monthlyBudget !== undefined && ret.monthlyBudget !== null) {
					ret.monthlyBudget = parseFloat(ret.monthlyBudget.toString());
				}
				delete ret.__v;
				return ret;
			},
		},

		toObject: {
			transform: function (doc, ret) {
				if (ret.monthlyBudget !== undefined && ret.monthlyBudget !== null) {
					ret.monthlyBudget = parseFloat(ret.monthlyBudget.toString());
				}
				delete ret.__v;
				return ret;
			},
		},
	}
);

// =================================================================
//                          INDEXES
// =================================================================

// Primary indexes for performance
CategorySchema.index({ userId: 1, type: 1 }, { background: true });
CategorySchema.index({ userId: 1, isDeleted: 1 }, { background: true });
CategorySchema.index({ parentId: 1 }, { background: true, sparse: true });
CategorySchema.index({ userId: 1, name: 1 }, { background: true });
CategorySchema.index(
	{ userId: 1, name: 1, type: 1, isDeleted: 1 },
	{ background: true, unique: true }
);

// Compound index for category hierarchy queries
CategorySchema.index({ userId: 1, type: 1, parentId: 1 }, { background: true });

// ENTERPRISE SOLUTION: Compound unique index for default categories
// Only ONE default per user per type - enforced at database level
CategorySchema.index(
	{ userId: 1, type: 1, isDefault: 1 },
	{
		background: true,
		unique: true,
		partialFilterExpression: { isDefault: true },
	}
);
// =================================================================
//                      INSTANCE METHODS
// =================================================================

/**
 * Get all child categories
 * @returns {Promise<Category[]>} - Array of child categories
 */
CategorySchema.methods.getChildren = function () {
	return this.constructor
		.find({
			parentId: this._id,
			isDeleted: false,
		})
		.sort({ name: 1 });
};

/**
 * Get category hierarchy path
 * @returns {Promise<string>} - Full path like "Parent > Child > Current"
 */
CategorySchema.methods.getHierarchyPath = async function () {
	const path = [];
	let current = this;

	while (current) {
		path.unshift(current.name);

		if (current.parentId) {
			current = await this.constructor.findById(current.parentId);
		} else {
			current = null;
		}
	}

	return path.join(" > ");
};

/**
 * Soft delete category and all children
 * @returns {Promise<void>}
 */
CategorySchema.methods.softDelete = async function () {
	// Mark this category as deleted - use updateOne to skip pre-save hooks
	const date = new Date();
	await this.constructor.updateOne(
		{ _id: this._id },
		{
			$set: {
				isDeleted: true,
				deletedAt: date,
			},
		}
	);

	// Update local document state
	this.isDeleted = true;
	this.deletedAt = date;

	// Recursively delete children
	const children = await this.getChildren();
	await Promise.all(children.map((child) => child.softDelete()));
};

/**
 * Get monthly budget as number
 * @returns {number} - Monthly budget amount
 */
CategorySchema.methods.getMonthlyBudgetAmount = function () {
	return parseFloat(this.monthlyBudget.toString());
};

// =================================================================
//                       STATIC METHODS
// =================================================================

/**
 * Find categories by user and type
 * @param {ObjectId} userId - User ID
 * @param {string} type - Category type ('income' or 'expense')
 * @param {boolean} includeDeleted - Include deleted categories
 * @returns {Promise<Category[]>} - Array of categories
 */
CategorySchema.statics.findByUserAndType = function (
	userId,
	type,
	includeDeleted = false
) {
	const query = { userId, type };

	if (!includeDeleted) {
		query.isDeleted = false;
	}

	return this.find(query).sort({ name: 1 });
};

/**
 * Get category hierarchy for user
 * @param {ObjectId} userId - User ID
 * @param {string} type - Category type
 * @returns {Promise<Object>} - Hierarchical category structure
 */
CategorySchema.statics.getCategoryHierarchy = async function (userId, type) {
	const categories = await this.find({
		userId,
		type,
		isDeleted: false,
	}).sort({ name: 1 });

	// Build hierarchy
	const categoryMap = new Map();
	const rootCategories = [];

	// First pass: create map
	categories.forEach((category) => {
		categoryMap.set(category._id.toString(), {
			...category.toObject(),
			children: [],
		});
	});

	// Second pass: build hierarchy
	categories.forEach((category) => {
		const categoryObj = categoryMap.get(category._id.toString());

		if (category.parentId) {
			const parent = categoryMap.get(category.parentId.toString());
			if (parent) {
				parent.children.push(categoryObj);
			} else {
				// Parent not found, treat as root
				rootCategories.push(categoryObj);
			}
		} else {
			rootCategories.push(categoryObj);
		}
	});

	return rootCategories;
};

/**
 * Create default categories for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Category[]>} - Created default categories
 */
CategorySchema.statics.createDefaultCategories = async function (userId) {
	const defaultCategories = [
		// Income categories - Only "Salary" is default
		{
			name: "Salary",
			type: "income",
			color: "#4CAF50",
			icon: "briefcase",
			isDefault: true,
		},
		{
			name: "Freelance",
			type: "income",
			color: "#2196F3",
			icon: "laptop",
			isDefault: false,
		},
		{
			name: "Investment",
			type: "income",
			color: "#FF9800",
			icon: "trending-up",
			isDefault: false,
		},
		{
			name: "Other Income",
			type: "income",
			color: "#9C27B0",
			icon: "plus-circle",
			isDefault: false,
		},

		// Expense categories - Only "Food & Dining" is default
		{
			name: "Food & Dining",
			type: "expense",
			color: "#F44336",
			icon: "utensils",
			isDefault: true,
		},
		{
			name: "Transportation",
			type: "expense",
			color: "#3F51B5",
			icon: "car",
			isDefault: false,
		},
		{
			name: "Shopping",
			type: "expense",
			color: "#E91E63",
			icon: "shopping-bag",
			isDefault: false,
		},
		{
			name: "Entertainment",
			type: "expense",
			color: "#9C27B0",
			icon: "film",
			isDefault: false,
		},
		{
			name: "Bills & Utilities",
			type: "expense",
			color: "#607D8B",
			icon: "file-text",
			isDefault: false,
		},
		{
			name: "Healthcare",
			type: "expense",
			color: "#4CAF50",
			icon: "heart",
			isDefault: false,
		},
		{
			name: "Education",
			type: "expense",
			color: "#FF9800",
			icon: "book",
			isDefault: false,
		},
		{
			name: "Other Expenses",
			type: "expense",
			color: "#795548",
			icon: "more-horizontal",
			isDefault: false,
		},
	];

	const categories = defaultCategories.map((cat) => ({
		...cat,
		userId,
		monthlyBudget: 0,
	}));

	return await this.insertMany(categories);
};

/**
 * Set default category - Enterprise approach with atomic operations
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} categoryId - Category ID to set as default
 * @returns {Promise<Category>} - Updated category
 */
CategorySchema.statics.setDefaultCategory = async function (
	userId,
	categoryId
) {
	// Get the category to determine its type
  const category = await this.findOne({
		_id: categoryId,
		userId,
		isDeleted: false,
	});
	if (!category) {
		const error = new Error("Category not found");
		error.status = 404;
		throw error;
	}

  // Unset any other default of same type for this user
  await this.updateOne(
    { userId, type: category.type, isDefault: true, _id: { $ne: categoryId } },
    { $set: { isDefault: false } }
  );

	// Step 2: Set new default
	await this.updateOne({ _id: categoryId }, { $set: { isDefault: true } });
	return await this.findById(categoryId);
};

/**
 * Get default category for user and type
 * @param {ObjectId} userId - User ID
 * @param {string} type - Category type ('income' or 'expense')
 * @returns {Promise<Category|null>} - Default category or null
 */
CategorySchema.statics.getDefaultCategory = function (userId, type) {
	return this.findOne({ userId, type, isDefault: true, isDeleted: false });
};

// =================================================================
//                      VIRTUAL PROPERTIES
// =================================================================

/**
 * Virtual for checking if category has children
 */
CategorySchema.virtual("hasChildren").get(function () {
	return this.children && this.children.length > 0;
});

// Ensure virtual fields are serialized WITHOUT overwriting existing transforms
CategorySchema.options.toJSON = {
	...(CategorySchema.options.toJSON || {}),
	virtuals: true,
};
CategorySchema.options.toObject = {
	...(CategorySchema.options.toObject || {}),
	virtuals: true,
};

// =================================================================
//                      MODEL EXPORT
// =================================================================

const Category = mongoose.model("Category", CategorySchema);

module.exports = Category;
