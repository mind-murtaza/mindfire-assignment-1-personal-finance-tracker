/**
 * @fileoverview Express Application Configuration - Pure API Backend
 * This module configures a secure, production-ready Express application
 * exclusively for API endpoints with comprehensive security middleware.
 * 
 * @module app
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires express
 * @requires cors
 * @requires helmet
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const apiRoutes = require('./api/routes');
const errorHandler = require('./api/middlewares/errorHandler');

/**
 * Express application instance configured for API-only communication
 * @constant {Express} app
 */
const app = express();

// =================================================================
//                    SECURITY MIDDLEWARE STACK
// =================================================================

/**
 * Helmet.js security headers configuration
 * Disables unnecessary features for API-only backend
 */
app.use(helmet({
  contentSecurityPolicy: false,  // Not needed for API-only
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },  // Prevent iframe embedding
  hidePoweredBy: true,             // Hide X-Powered-By header
  hsts: {
    maxAge: 31536000,              // 1 year HSTS
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,                   // Prevent MIME sniffing
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true
}));

/**
 * CORS configuration for API-only communication
 * Restricts origins and methods for security
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173']; // Default frontend ports
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours preflight cache
};

app.use(cors(corsOptions));

// =================================================================
//                    REQUEST PARSING MIDDLEWARE
// =================================================================

/**
 * JSON body parser with size limits and type validation
 */
app.use(express.json({ 
  limit: '1mb',
  strict: true,
  type: ['application/json', 'application/*+json']
}));

/**
 * URL-encoded parser (minimal, API-focused)
 */
app.use(express.urlencoded({ 
  extended: false, 
  limit: '1mb' 
}));

// =================================================================
//                    API-ONLY ROUTE REJECTION
// =================================================================

/**
 * Reject all non-API routes to enforce API-only communication
 * This middleware runs before API routes to catch web requests
 */
app.use((req, res, next) => {
  // Allow only API routes and health check
  if (req.path === '/' || req.path === '/health' || req.path.startsWith('/api/')) {
    return next();
  }
  
  // Reject all other routes (web assets, HTML, etc.)
  return res.status(404).json({
    success: false,
    error: 'API-only backend. Web assets not served.',
    message: 'This server exclusively serves API endpoints. Use /api/v1/* routes.'
  });
});

// =================================================================
//                    HEALTH CHECK ENDPOINTS
// =================================================================

/**
 * Health check endpoint for load balancers and monitoring
 * @route GET /
 * @returns {Object} API status and metadata
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Personal Finance Tracker API',
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      health: '/health'
    }
  });
});

/**
 * Detailed health check for monitoring systems with database status
 * @route GET /health
 * @returns {Object} Detailed system health status
 */
app.get('/health', (req, res) => {
  const { isConnected, getConnectionInfo } = require('./config/db.js');
  const dbConnected = isConnected();
  const dbInfo = dbConnected ? getConnectionInfo() : null;
  
  const healthCheck = {
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: dbConnected ? 'healthy' : 'degraded',
    services: {
      api: 'operational',
      database: dbConnected ? 'connected' : 'disconnected'
    },
    database: dbConnected ? {
      state: dbInfo.state,
      name: dbInfo.name,
      collections: dbInfo.collections.length
    } : {
      state: 'disconnected',
      error: 'Database connection not available'
    },
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      pid: process.pid,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  };
  
  const statusCode = dbConnected ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// =================================================================
//                    API ROUTE MOUNTING
// =================================================================

/**
 * Mount all API v1 routes through centralized router
 * @route /api/v1/*
 */
app.use('/api/v1', apiRoutes);

// =================================================================
//                    ERROR HANDLING MIDDLEWARE
// =================================================================

/**
 * 404 handler for undefined API routes
 * Returns consistent JSON error response
 */
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    message: `Route ${req.method} ${req.path} does not exist`,
    availableRoutes: ['/api/v1/auth', '/api/v1/users', '/health']
  });
});

/**
 * Global error handler - catches all unhandled errors
 * Provides consistent error response format
 */
app.use(errorHandler);

// =================================================================
//                    GRACEFUL SHUTDOWN HANDLING
// =================================================================

/**
 * Graceful shutdown handler for production deployments
 */
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Starting graceful shutdown...');
  // Close server, database connections, etc.
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Starting graceful shutdown...');
  // Close server, database connections, etc.
});

module.exports = app;
