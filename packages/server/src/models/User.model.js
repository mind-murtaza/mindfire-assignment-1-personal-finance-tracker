/**
 * User Model
 * Purpose: Stores user identity, credentials, and application settings
 *
 * Performance Optimizations:
 * - Email index for fast login lookups
 * - Status index for user management queries
 * - Compound indexes for common query patterns
 *
 * Security Features:
 * - Password automatically hashed via pre-save middleware
 * - Email validation and normalization via Zod
 * - Account status tracking
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const {
	createUserSchema,
	updateUserSchema,
} = require("../schemas");

const { Schema } = mongoose;

// =================================================================
//                      USER SCHEMA DEFINITION
// =================================================================

const UserSchema = new Schema(
	{
		// Authentication fields
		email: {
			type: String,
		},
		password: {
			type: String,
			select: false, // Never include password in queries by default
		},

		// User profile information
		profile: {
			firstName: {
				type: String,
			},
			lastName: {
				type: String,
			},
			avatarUrl: {
				type: String,
			},
			mobileNumber: {
				type: String,
			},
		},

		// Application settings
		settings: {
			mobileDialCode: {
				type: String,
				default: "+91",
			},
			currency: {
				type: String,
				default: "INR",
			},
			theme: {
				type: String,
				default: "system",
			},
		},

		// Account status management
		status: {
			type: String,
			default: "pending_verification",
		},

		// Activity tracking
		lastLoginAt: {
			type: Date,
			default: null,
		},
	},
	{
		// Schema options
		timestamps: true, // Automatically adds createdAt and updatedAt
		collection: "users",

		// Optimize for memory usage and performance
		minimize: false,
		validateBeforeSave: true,

		// JSON transformation options
		toJSON: {
			/**
			 * remove password and __v (Mon) from the output
			 */
			transform: function (doc, ret) {
				// Remove sensitive fields from JSON output
				delete ret.password;
				delete ret.__v;
				return ret;
			},
		},
		toObject: {
			transform: function (doc, ret) {
				delete ret.password;
				delete ret.__v;
				return ret;
			},
		},
	}
);

// =================================================================
//                          INDEXES
// =================================================================

/**
 * Primary indexes for performance
 * background: true means that the index will be created in the background
 */
UserSchema.index({ email: 1 }, { unique: true, background: true });
UserSchema.index({ status: 1 }, { background: true });

/**
 * Compound indexes for common queries
 * Compound index for efficient queries by status, sorted by most recent lastLoginAt (descending)
 */
UserSchema.index({ status: 1, lastLoginAt: -1 }, { background: true });

// =================================================================
//                      MIDDLEWARE HOOKS
// =================================================================

/**
 * Pre-save middleware for Zod validation and password hashing
 */
UserSchema.pre("save", async function (next) {
	try {
		// STEP 1: VALIDATE NEW DOCUMENTS ONLY WITH ZOD
		// For new documents, we validate the complete user object
		if (this.isNew) {
            // For new documents, we construct a plain object to avoid passing Mongoose-added fields to Zod
            const plainUserObject = {
                email: this.email,
                password: this.password,
                profile: this.profile,
                settings: this.settings,
                status: this.status
            };
			const validation = createUserSchema.safeParse(plainUserObject);
			if (!validation.success) {
				const error = new Error(validation.error.issues[0].message);
				error.name = "ValidationError";
				return next(error);
			}
			// Apply Zod's transformations (e.g., toLowerCase, trim) back to the document
			const { email, profile } = validation.data;
			this.email = email;
			this.profile.firstName = profile.firstName;
			this.profile.lastName = profile.lastName;
		}
		// For updates: NO validation here. Updates should be validated at API layer.
		// This keeps the model simple and follows single responsibility principle.

		// STEP 2: SECURELY TRANSFORM THE PASSWORD (IF MODIFIED)
		// This runs for both new documents and updates when password is modified
		if (this.isModified("password")) {
			const saltRounds = 12;
			this.password = await bcrypt.hash(this.password, saltRounds);
		}

		next();
	} catch (error) {
		next(error);
	}
});

// =================================================================
//                       STATIC METHODS
// =================================================================

/**
 * Compare password for authentication
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - True if password matches
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
	try {
        // re-fetch password as it is not selected by default
        const user = await this.constructor.findById(this._id).select('+password');
		return await bcrypt.compare(candidatePassword, user.password);
	} catch (error) {
		throw new Error("Password comparison failed");
	}
};

// =================================================================
//                      INSTANCE METHODS
// =================================================================


/**
 * Get user's full name
 * @returns {string} - Full name
 */
UserSchema.methods.getFullName = function () {
	return `${this.profile.firstName} ${this.profile.lastName}`.trim();
};

/**
 * Check if user account is active
 * @returns {boolean} - True if account is active
 */
UserSchema.methods.isActive = function () {
	return this.status === "active";
};

/**
 * Update last login timestamp
 * @returns {Promise<User>} - Updated user document
 */
UserSchema.methods.updateLastLogin = async function () {
	this.lastLoginAt = new Date();
	return await this.save();
};

/**
 * Soft delete user account
 * @returns {Promise<User>} - Updated user document
 */
UserSchema.methods.softDelete = async function () {
	this.status = "deleted";
	return await this.save();
};

// =================================================================
//                       STATIC METHODS
// =================================================================

/**
 * Find user by email (excluding deleted users)
 * @param {string} email - User email
 * @returns {Promise<User|null>} - User document or null
 */
UserSchema.statics.findByEmail = function (email) {
	return this.findOne({
		email: email.toLowerCase().trim(),
		status: { $ne: "deleted" },
	});
};

/**
 * Find active users with pagination
 * @param {Object} options - Pagination options
 * @returns {Promise<{users: User[], total: number}>} - Paginated results
 */
UserSchema.statics.findActiveUsers = async function (options = {}) {
	const {
		page = 1,
		limit = 20,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = options;
	const skip = (page - 1) * limit;

	const [users, total] = await Promise.all([
		this.find({ status: "active" })
			.sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
			.skip(skip)
			.limit(limit)
			.lean(),
		this.countDocuments({ status: "active" }),
	]);

	return { users, total };
};

// =================================================================
//                      VIRTUAL PROPERTIES
// =================================================================

/**
 * Virtual for user's full name
 */
UserSchema.virtual("fullName").get(function () {
	return this.getFullName();
});

/**
 * Virtual for user's initials
 */
UserSchema.virtual("initials").get(function () {
	const firstName = this.profile.firstName || "";
	const lastName = this.profile.lastName || "";
	return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
});

// Ensure virtual fields are serialized
UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

// =================================================================
//                      MODEL EXPORT
// =================================================================

const User = mongoose.model("User", UserSchema);

module.exports = User;