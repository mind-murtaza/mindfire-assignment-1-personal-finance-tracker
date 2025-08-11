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
            'POST /register': 'User registration with email verification',
            'POST /login': 'User authentication with email/password',
            'POST /refresh': 'Token refresh (requires valid token)',
            'POST /forgot-password': 'Request password reset email',
            'POST /reset-password': 'Reset password using token',
            'POST /verify-email': 'Verify email address using token',
            'POST /request-otp': 'Request OTP for passwordless login',
            'POST /verify-otp': 'Verify OTP and authenticate user'
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
      authentication: {
        type: 'Bearer JWT token required for protected routes',
        flows: [
          'Email/Password login',
          'OTP (passwordless) login',
          'Email verification required for new accounts',
          'Password reset via email token'
        ]
      },
      contentType: 'application/json',
      features: [
        'JWT-based authentication',
        'Email verification system',
        'Password reset functionality', 
        'OTP (passwordless) authentication',
        'Comprehensive input validation',
        'Background email processing'
      ],
      status: 'Production Ready'
    }
  });
});

module.exports = router;
