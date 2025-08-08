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

// Import individual route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');

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
  res.set('X-Service', 'Personal-Finance-Tracker');
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
    message: 'Personal Finance Tracker API v1.0.0',
    version: '1.0.0',
    documentation: {
      endpoints: {
        auth: {
          base: '/api/v1/auth',
          routes: {
            'POST /register': 'User registration',
            'POST /login': 'User authentication'
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
        }
      },
      authentication: 'Bearer JWT token required for protected routes',
      contentType: 'application/json'
    }
  });
});

module.exports = router;
