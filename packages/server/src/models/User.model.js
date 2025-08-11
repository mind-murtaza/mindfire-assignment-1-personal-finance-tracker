/**
 * @fileoverview User Model - Identity, Credentials, and Settings.
 * Enterprise-grade Mongoose model for users with secure password handling,
 * Zod-backed validation in pre-save hooks, and rich instance/statics for
 * profile, settings, and account lifecycle management.
 *
 * @module models/User
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires mongoose
 * @requires bcryptjs
 * @requires ../schemas
 *
 * @description
 * Performance:
 * - Email index for fast login lookups
 * - Status and composite indexes for common user management queries
 *
 * Security:
 * - Password hashed in pre-save with bcrypt (saltRounds=12)
 * - Data validation handled at API route level (API-first architecture)
 * - JSON transforms strip sensitive fields (password, __v)
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
// No schema imports needed - validation handled at route level

/**
 * @typedef {Object} UserProfile
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [avatarUrl]
 * @property {string} [mobileNumber]
 */

/**
 * @typedef {Object} UserSettings
 * @property {string} [mobileDialCode]
 * @property {string} [currency]
 * @property {('light'|'dark'|'system')} [theme]
 */

/**
 * @typedef {Object} UserDocument
 * @property {string} email
 * @property {string} password
 * @property {UserProfile} profile
 * @property {UserSettings} settings
 * @property {('active'|'suspended'|'pending_verification'|'deleted')} status
 * @property {Date|null} lastLoginAt
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {function(string): Promise<boolean>} comparePassword
 * @property {function(): string} getFullName
 * @property {function(): boolean} isActive
 * @property {function(): {isActive: boolean, status: string, statusCode: (number|null)}} getStatusInfo
 * @property {function(): Promise<UserDocument>} updateLastLogin
 * @property {function(UserProfile): Promise<UserDocument>} updateProfile
 * @property {function(UserSettings): Promise<UserDocument>} updateSettings
 * @property {function(string): Promise<UserDocument>} updatePassword
 * @property {function(): Promise<UserDocument>} softDelete
 */

const { Schema } = mongoose;

// =================================================================
//                      USER SCHEMA DEFINITION
// =================================================================

/**
 * Mongoose schema for User collection.
 * @constant {Schema<UserDocument>} UserSchema
 */
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
		/**
		 * User account status.
		 * Possible values: 'active' | 'suspended' | 'pending_verification' | 'deleted'
		 */
		status: {
			type: String,
			default: "pending_verification",
		},

		/**
		 * Last login timestamp.
		 * @type {Date|null}
		 */
		lastLoginAt: {
			type: Date,
			default: null,
		},
	},
	{
		// Schema options
		timestamps: true,
		collection: "users",

		// Optimize for memory usage and performance
		minimize: false,
		validateBeforeSave: true,

		// JSON transformation options
		toJSON: {
			/**
			 * Remove sensitive fields from JSON output
			 */
			transform: function (doc, ret) {
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
 * Unique index on email for fast authentication lookups.
 */
UserSchema.index({ email: 1 }, { unique: true, background: true });

/**
 * Secondary index on status for management queries.
 */
UserSchema.index({ status: 1 }, { background: true });

/**
 * Compound index for status and last login recency.
 */
UserSchema.index({ status: 1, lastLoginAt: -1 }, { background: true });

// =================================================================
//                      MIDDLEWARE HOOKS
// =================================================================

/**
 * Pre-save middleware
 * - Data transformations (toLowerCase, trim)
 * - Password hashing on change
 * - No validation (handled at route level for API-first architecture)
 *
 * @this {UserDocument}
 * @param {Function} next Express next
 */
UserSchema.pre("save", async function (next) {
	try {
			// Password validation handled at route level - just hash here
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
 * Compare password for authentication.
 * @function comparePassword
 * @memberof UserDocument
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
	try {
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
 * Get user's full name.
 * @function getFullName
 * @memberof UserDocument
 * @returns {string}
 */
UserSchema.methods.getFullName = function () {
	return `${this.profile.firstName} ${this.profile.lastName}`.trim();
};

/**
 * Check if user account is active.
 * @function isActive
 * @memberof UserDocument
 * @returns {boolean}
 */
UserSchema.methods.isActive = function () {
	return this.status === "active";
};

/**
 * Get status info including recommended HTTP status for non-active states.
 * @function getStatusInfo
 * @memberof UserDocument
 * @returns {{isActive:boolean,status:string,statusCode:(number|null)}}
 */
UserSchema.methods.getStatusInfo = function () {
	const STATUS_CODE_MAP = {
		active: null,
		suspended: 403,
		deleted: 401,
		pending_verification: 401
	};

	return {
		isActive: this.status === "active",
		status: this.status,
		statusCode: STATUS_CODE_MAP[this.status] || 401
	};
};

/**
 * Update last login timestamp and persist.
 * @function updateLastLogin
 * @memberof UserDocument
 * @returns {Promise<UserDocument>}
 * @example
 * await user.updateLastLogin();
 */
UserSchema.methods.updateLastLogin = async function () {
	this.lastLoginAt = new Date();
	return await this.save();
};

/**
 * Partially update profile fields and persist (validated in pre-save).
 * @function updateProfile
 * @memberof UserDocument
 * @param {UserProfile} profileData
 * @returns {Promise<UserDocument>}
 */
UserSchema.methods.updateProfile = async function (profileData) {
	// Only update fields that are actually provided (not undefined)
	Object.keys(profileData).forEach(key => {
		if (profileData[key] !== undefined && this.profile.hasOwnProperty(key)) {
			this.profile[key] = profileData[key];
		}
	});
	
	return await this.save(); // Triggers pre-save validation
};

/**
 * Partially update settings and persist (validated in pre-save).
 * @function updateSettings
 * @memberof UserDocument
 * @param {UserSettings} settingsData
 * @returns {Promise<UserDocument>}
 */
UserSchema.methods.updateSettings = async function (settingsData) {
	// Only update fields that are actually provided (not undefined)
	Object.keys(settingsData).forEach(key => {
		if (settingsData[key] !== undefined && this.settings.hasOwnProperty(key)) {
			this.settings[key] = settingsData[key];
		}
	});
	
	return await this.save(); // Triggers pre-save validation
};

/**
 * Update password (hashed by pre-save hook).
 * @function updatePassword
 * @memberof UserDocument
 * @param {string} newPassword
 * @returns {Promise<UserDocument>}
 */
UserSchema.methods.updatePassword = async function (newPassword) {
	this.password = newPassword;
	return await this.save(); // Triggers pre-save validation and hashing
};

/**
 * Soft delete the user by setting status to 'deleted'.
 * @function softDelete
 * @memberof UserDocument
 * @returns {Promise<UserDocument>}
 */
UserSchema.methods.softDelete = async function () {
	this.status = "deleted";
	return await this.save();
};

// =================================================================
//                       STATIC METHODS
// =================================================================

/**
 * Find user by normalized email, excluding deleted.
 * @function findByEmail
 * @memberof UserModel
 * @param {string} email
 * @returns {Promise<UserDocument|null>}
 */
UserSchema.statics.findByEmail = function (email) {
	return this.findOne({
		email: email.toLowerCase().trim(),
		status: { $ne: "deleted" },
	});
};

/**
 * Find active users with pagination.
 * @function findActiveUsers
 * @memberof UserModel
 * @param {{page?:number,limit?:number,sortBy?:string,sortOrder?:('asc'|'desc')}} [options]
 * @returns {Promise<{users: UserDocument[], total: number}>}
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