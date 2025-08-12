/**
 * @fileoverview Enterprise-Grade Database Configuration
 * Provides robust MongoDB connection management with retry logic,
 * environment-aware configurations, and comprehensive error handling.
 * 
 * @module config/db
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 * @requires mongoose
 */

const mongoose = require('mongoose');
require('dotenv').config();

// =================================================================
//                    ENVIRONMENT CONFIGURATION
// =================================================================

/**
 * Current environment
 * @constant {string} NODE_ENV
 */
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Environment-aware connection configurations
 * @constant {Object} CONNECTION_CONFIGS
 */
const CONNECTION_CONFIGS = {
  development: {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 5,
    minPoolSize: 1,
    family: 4,
    autoIndex: true,
    connectTimeoutMS: 10000,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
    dbName: process.env.MONGO_DB || 'pft_dev'
  },
  test: {
    serverSelectionTimeoutMS: 2000,
    socketTimeoutMS: 10000,
    maxPoolSize: 2,
    minPoolSize: 1,
    family: 4,
    autoIndex: true,
    connectTimeoutMS: 5000,
    maxIdleTimeMS: 10000,
    retryWrites: false,
    retryReads: false,
    dbName: process.env.MONGO_DB || 'pft_test'
  },
  production: {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 60000,
    maxPoolSize: 15,
    minPoolSize: 3,
    family: 4,
    autoIndex: true,
    connectTimeoutMS: 15000,
    maxIdleTimeMS: 60000,
    retryWrites: true,
    retryReads: true,
    heartbeatFrequencyMS: 10000,
    serverSelectionRetryDelayMS: 2000,
    dbName: process.env.MONGO_DB || 'pft_prod'
  }
};

/**
 * Get environment-specific connection options
 * @function getConnectionOptions
 * @returns {Object} Mongoose connection options
 */
const getConnectionOptions = () => {
  const config = CONNECTION_CONFIGS[NODE_ENV] || CONNECTION_CONFIGS.development;
  
  return {
    ...config
  };
};

// =================================================================
//                    CONNECTION MANAGEMENT
// =================================================================

/**
 * Connection retry configuration
 * @constant {Object} RETRY_CONFIG
 */
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

/**
 * Calculate retry delay with exponential backoff
 * @function getRetryDelay
 * @param {number} attempt - Current attempt number
 * @returns {number} Delay in milliseconds
 */
const getRetryDelay = (attempt) => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
};

/**
 * Sleep utility for retry delays
 * @function sleep
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enterprise-grade MongoDB connection with retry logic
 * @async
 * @function connectDB
 * @returns {Promise<mongoose.Connection>} MongoDB connection instance
 * @throws {Error} When connection fails after all retries
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    const error = new Error('MONGO_URI environment variable is required');
    error.code = 'MISSING_MONGO_URI';
    throw error;
  }

  const connectionOptions = getConnectionOptions();
  let lastError = null;

  // Attempt connection with retry logic
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`⏳ Connecting to MongoDB... (Attempt ${attempt}/${RETRY_CONFIG.maxRetries})`);
      console.log(`🔧 Environment: ${NODE_ENV}`);
      
      await mongoose.connect(mongoURI, connectionOptions);
      
      console.log('✅ MongoDB connection established successfully');
      console.log(`📊 Connection Pool: ${connectionOptions.minPoolSize}-${connectionOptions.maxPoolSize}`);
      console.log(`⚡ Database: ${mongoose.connection.name || 'Unknown'}`);
      
      return mongoose.connection;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Connection attempt ${attempt} failed: ${error.message}`);
      
      // Don't retry on authentication errors
      if (error.message.includes('authentication failed') || 
          error.message.includes('bad auth') ||
          error.message.includes('Authentication failed')) {
        console.error('🚫 Authentication error - not retrying');
        throw error;
      }
      
      // Don't retry if this is the last attempt
      if (attempt === RETRY_CONFIG.maxRetries) {
        console.error(`💥 All ${RETRY_CONFIG.maxRetries} connection attempts failed`);
        throw error;
      }
      
      // Wait before next attempt with exponential backoff
      const delay = getRetryDelay(attempt);
      console.log(`⏱️  Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  // This should never be reached, but included for safety
  throw lastError || new Error('Connection failed after all retry attempts');
};

/**
 * Setup comprehensive connection event handlers
 * @function setupConnectionHandlers
 */
const setupConnectionHandlers = () => {
  // Connection successful
  mongoose.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to MongoDB');
  });

  // Connection error during runtime
  mongoose.connection.on('error', (error) => {
    console.error('❌ MongoDB runtime error:', error.message);
    
    // Log critical errors for monitoring
    if (error.name === 'MongoNetworkError' || 
        error.name === 'MongoServerSelectionError') {
      console.error('🚨 Critical database connectivity issue detected');
    }
  });

  // Connection lost
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB connection lost');
  });

  // Connection restored
  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB connection restored');
  });

  // Connection close
  mongoose.connection.on('close', () => {
    console.log('🔌 MongoDB connection closed');
  });
};

// =================================================================
//                    HEALTH CHECK & UTILITIES
// =================================================================

/**
 * Check database connection health
 * @async
 * @function isConnected
 * @returns {boolean} Connection status
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get connection status information
 * @function getConnectionInfo
 * @returns {Object} Connection information
 */
const getConnectionInfo = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    collections: Object.keys(mongoose.connection.collections)
  };
};

/**
 * Graceful database disconnect (for controlled shutdowns)
 * @async
 * @function disconnect
 * @returns {Promise<void>}
 */
const disconnect = async () => {
  if (mongoose.connection.readyState !== 0) {
    console.log('🔌 Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed gracefully');
  }
};

// Setup event handlers when module is loaded
setupConnectionHandlers();

// =================================================================
//                         MODULE EXPORTS
// =================================================================

module.exports = {
  connectDB,
  disconnect,
  isConnected,
  getConnectionInfo,
};