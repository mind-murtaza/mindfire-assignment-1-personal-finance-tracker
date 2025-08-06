/**
 * Models Index - The Architect's Centralized Model Exports
 * Purpose: Barrel export pattern for clean model imports
 * 
 * Usage:
 * const { User, Category, Transaction } = require('./models');
 * 
 * Benefits:
 * - Single import source for all models
 * - Easier refactoring and dependency management
 * - Consistent naming across application
 */

const User = require('./User.model');
const Category = require('./Category.model');
const Transaction = require('./Transaction.model');

module.exports = {
  User,
  Category,
  Transaction
};