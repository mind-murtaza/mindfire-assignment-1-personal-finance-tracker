/**
 * @fileoverview Sanitizers for API responses
 * Provides utility functions to safely serialize database documents
 * by whitelisting fields intended for clients.
 */

/**
 * Sanitize a User document/object for client responses.
 * - Whitelists only non-sensitive fields
 * - Excludes password and internal metadata
 *
 * @param {Object} user - Mongoose document or plain object
 * @returns {Object|null} Safe, client-facing user object
 */
function sanitizeUser(user) {
	if (!user) return null;
	const u = typeof user.toJSON === "function" ? user.toJSON() : user;

	return {
		id: u.id || u._id.toString(),
		email: u.email,
		status: u.status,
		fullName: u.fullName,
		initials: u.initials,
		profile: {
			firstName: u.profile?.firstName ?? null,
			lastName: u.profile?.lastName ?? null,
			avatarUrl: u.profile?.avatarUrl ?? null,
			mobileNumber: u.profile?.mobileNumber ?? null,
		},
		settings: {
			mobileDialCode: u.settings?.mobileDialCode,
			currency: u.settings?.currency,
			theme: u.settings?.theme,
		},
		status: u.status,
		lastLoginAt: u.lastLoginAt,
		createdAt: u.createdAt,
	};
}

module.exports = { sanitizeUser };
