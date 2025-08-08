/**
 * @fileoverview Server Bootstrap - Enterprise-Grade Application Entry Point
 * Initializes the Express server, establishes database connections,
 * and configures production-ready server infrastructure for API-only communication.
 * 
 * @module server
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires dotenv
 * @requires ./app
 * @requires ./config/db
 */

require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db.js');

// =================================================================
//                    SERVER CONFIGURATION
// =================================================================

/**
 * Server port configuration with fallback
 * @constant {number} PORT
 */
const PORT = parseInt(process.env.PORT, 10) || 4000;

/**
 * Environment detection
 * @constant {string} NODE_ENV
 */
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Server instance reference for graceful shutdown
 * @type {Server|null}
 */
let serverInstance = null;

// =================================================================
//                    ENVIRONMENT VALIDATION
// =================================================================

/**
 * Validates required environment variables for production readiness
 * @function validateEnvironment
 * @throws {Error} When required environment variables are missing
 */
function validateEnvironment() {
  const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('📋 Create a .env file with the required variables');
    process.exit(1);
  }

  // Validate JWT_SECRET strength in production
  if (NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET must be at least 32 characters in production');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

// =================================================================
//                    SERVER STARTUP SEQUENCE
// =================================================================

/**
 * Comprehensive server startup with error handling and monitoring
 * @async
 * @function startServer
 * @throws {Error} When server startup fails
 */
const startServer = async () => {
  try {
    console.log('🚀 Starting Personal Finance Tracker API Server...');
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`🔧 Node.js Version: ${process.version}`);
    console.log(`💾 Platform: ${process.platform} ${process.arch}`);

    // Step 1: Environment validation
    validateEnvironment();

    // Step 2: Database connection
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Database connection established');

    // Step 3: Ensure indexes (production optimization)
    if (NODE_ENV === 'production') {
      console.log('📊 Ensuring database indexes...');
      const { User, Category, Transaction } = require('./models');
      await Promise.all([
        User.ensureIndexes(),
        Category.ensureIndexes(),
        Transaction.ensureIndexes()
      ]);
      console.log('✅ Database indexes verified');
    }

    // Step 4: Start HTTP server
    console.log(`🌐 Starting HTTP server on port ${PORT}...`);
    serverInstance = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🎉 ================================');
      console.log('🚀 SERVER SUCCESSFULLY STARTED');
      console.log('🎉 ================================');
      console.log(`📍 API Base URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📋 API Routes:`);
      console.log(`   - Authentication: http://localhost:${PORT}/api/v1/auth`);
      console.log(`   - User Management: http://localhost:${PORT}/api/v1/users`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`⚡ Process ID: ${process.pid}`);
      console.log('🎉 ================================');
      console.log('');
    });

    // Configure server timeouts for production
    if (NODE_ENV === 'production') {
      serverInstance.timeout = 30000; // 30 seconds
      serverInstance.keepAliveTimeout = 65000; // 65 seconds
      serverInstance.headersTimeout = 66000; // 66 seconds
    }

  } catch (error) {
    console.error('');
    console.error('💥 ================================');
    console.error('❌ SERVER STARTUP FAILED');
    console.error('💥 ================================');
    console.error('🔍 Error Details:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error('💥 ================================');
    console.error('');
    
    // Cleanup and exit
    await gracefulShutdown('STARTUP_ERROR');
  }
};

// =================================================================
//                    GRACEFUL SHUTDOWN HANDLING
// =================================================================

/**
 * Graceful shutdown handler for production deployments
 * @async
 * @function gracefulShutdown
 * @param {string} signal - Shutdown signal received
 */
const gracefulShutdown = async (signal) => {
  console.log('');
  console.log('🛑 ================================');
  console.log(`🛑 GRACEFUL SHUTDOWN INITIATED`);
  console.log(`📡 Signal: ${signal}`);
  console.log('🛑 ================================');

  // Step 1: Stop accepting new connections
  if (serverInstance) {
    console.log('🔌 Closing HTTP server...');
    serverInstance.close(() => {
      console.log('✅ HTTP server closed');
    });
  }

  // Step 2: Close database connections
  try {
    console.log('🗄️  Closing database connections...');
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }

  // Step 3: Clean exit
  console.log('✅ Graceful shutdown completed');
  console.log('🛑 ================================');
  console.log('');
  
  process.exit(signal === 'STARTUP_ERROR' ? 1 : 0);
};

// =================================================================
//                    PROCESS EVENT HANDLERS
// =================================================================

/**
 * Handle process termination signals
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// =================================================================
//                    SERVER STARTUP
// =================================================================

/**
 * Start server only when executed directly (not during tests)
 * This allows the module to be imported for testing without starting the server
 */
if (require.main === module && NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('💥 Fatal server startup error:', error);
    process.exit(1);
  });
}

// Export the app for testing purposes
module.exports = app;