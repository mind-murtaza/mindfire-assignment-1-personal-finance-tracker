/**
 * @fileoverview Centralized API Routes Index - Modular Route Management
 * This module provides a single entry point for all API routes,
 * enabling clean separation of concerns and centralized route management.
 * 
 * @module routes
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires express
 */

const express = require('express');
require('dotenv').config();
const appName = process.env.APP_NAME || "Personal Finance Tracker";
// Import individual route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const categoryRoutes = require("./category.routes");
const transactionRoutes = require("./transaction.routes");

/**
 * Main router instance for API v1
 * @constant {Router} router
 */
const router = express.Router();

// =================================================================
//                    API VERSION MIDDLEWARE
// =================================================================

/**
 * API version middleware - adds version info to all responses
 */
router.use((req, res, next) => {
  res.set('X-API-Version', '1.0.0');
  res.set('X-Service', appName);
  next();
});

// =================================================================
//                    ROUTE MOUNTING
// =================================================================

/**
 * Authentication routes
 * Handles user registration, login, token management
 * @route /auth/*
 */
router.use('/auth', authRoutes);

/**
 * User management routes  
 * Handles profile, settings, account operations
 * @route /users/*
 */
router.use('/users', userRoutes);

/**
 * Category management routes
 * Handles adding, updating, deleting, and retrieving categories
 * @route /categories/*
 */
router.use('/categories', categoryRoutes);

/**
 * Transaction management routes
 * Handles creating, updating, deleting, listing, and analytics
 * @route /transactions/*
 */
router.use('/transactions', transactionRoutes);

// =================================================================
//                    API DOCUMENTATION ENDPOINT
// =================================================================

/**
 * API documentation endpoint
 * Returns available routes and their descriptions
 * @route GET /
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: `${appName} API v1.0.0`,
    version: '1.0.0',
    documentation: {
      endpoints: {
        auth: {
          base: '/api/v1/auth',
          routes: {
            'POST /register': 'User registration',
            'POST /login': 'User authentication with email/password',
            'POST /refresh': 'Token refresh (requires valid token)'
          }
        },
        users: {
          base: '/api/v1/users',
          routes: {
            'GET /me': 'Get current user profile',
            'PATCH /me/profile': 'Update user profile',
            'PATCH /me/settings': 'Update user settings',
            'POST /me/change-password': 'Change user password',
            'DELETE /me': 'Delete user account'
          }
        },
        categories: {
          base: '/api/v1/categories',
          routes: {
            'POST /': 'Create category',
            'GET /': 'List categories',
            'GET /hierarchy': 'Get category hierarchy',
            'GET /:id': 'Get category by id',
            'PATCH /:id': 'Update category',
            'DELETE /:id': 'Soft delete category',
            'PATCH /:id/set-default': 'Set default category for type'
          }
        },
        transactions: {
          base: '/api/v1/transactions',
          routes: {
            'GET /': 'List transactions with filters and pagination',
            'POST /': 'Create transaction',
            'GET /summary': 'Get transaction summary',
            'GET /category-breakdown': 'Get category breakdown',
            'GET /:id': 'Get transaction by id',
            'PATCH /:id': 'Update transaction',
            'DELETE /:id': 'Soft delete transaction',
            'POST /:id/clone': 'Clone transaction'
          }
        }
      },
      authentication: {
        type: 'Bearer JWT token required for protected routes',
        flows: [
          'Email/Password login'
        ]
      },
      contentType: 'application/json',
      features: [
        'JWT-based authentication',
        'Comprehensive input validation',
        'User profile and settings management',
        'Categories with hierarchy and default handling',
        'Transactions with analytics (summary, breakdown)'
      ],
      status: 'Production Ready'
    }
  });
});

module.exports = router;
