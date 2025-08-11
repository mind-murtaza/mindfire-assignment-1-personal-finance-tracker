/**
 * @fileoverview User service layer providing business logic for user management.
 * This module handles user profile updates, settings management, password changes,
 * and account lifecycle operations using existing User model methods.
 * 
 * @module services/user
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires ../models

 */

const { User } = require('../models');

/**
 * Update user profile or settings using validation at route layer.
 * Leverages existing User model methods and error handling.
 * 
 * @function updateUser
 * @async
 * @param {string} userId - MongoDB ObjectId of the user to update
 * @param {Object} changes - Update data object (already validated at route layer)
 * @returns {Promise<User>} Updated user document
 * @throws {Error} When user doesn't exist or database operation fails
 * @since 1.0.0
 */
async function updateUserProfile(userId, profileData) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  
  return await user.updateProfile(profileData);
}

async function updateUserSettings(userId, settingsData) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  
  return await user.updateSettings(settingsData);
}

/**
 * Change user password using User model's comparePassword method.
 * Uses existing model pre-save hooks for password hashing.
 * 
 * @function changePassword
 * @async
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {string} currentPassword - User's current password for verification
 * @param {string} newPassword - New password (will be hashed by model hook)
 * @returns {Promise<void>} Resolves when password is successfully changed
 * @throws {Error} When user doesn't exist or current password is incorrect
 * @since 1.0.0
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  // Use existing User model method for password comparison
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    const err = new Error('Current password is incorrect');
    err.status = 400;
    throw err;
  }

  // Use model's updatePassword method
  await user.updatePassword(newPassword);
}

/**
 * Soft delete user account using User model's existing softDelete method.
 * 
 * @function softDelete
 * @async
 * @param {string} userId - MongoDB ObjectId of the user to soft delete
 * @returns {Promise<void>} Resolves when user is soft deleted
 * @throws {Error} When user doesn't exist
 * @since 1.0.0
 */
async function softDelete(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  
  // Use existing User model softDelete method
  await user.softDelete();
}

module.exports = {
  updateUserProfile,
  updateUserSettings,
  changePassword,
  softDelete,
};
