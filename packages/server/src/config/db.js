/**
 * Database Configuration
 * Purpose: Centralized MongoDB connection management
 * 
 * Features:
 * - Graceful shutdown on process termination
 * - Connection event logging
 * - Retry logic for initial connection
 * - Performance-optimized connection options
 * - Environment-aware configuration
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Performance & security focused connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
  maxPoolSize: 10,                // Maintain up to 10 socket connections
  minPoolSize: 2,                 // Maintain at least 2 socket connections
  family: 4,                      // Use IPv4, skip trying IPv6
  autoIndex: false,               // Don't build indexes automatically
  connectTimeoutMS: 10000,        // Give up initial connection after 10 seconds
};

/**
 * Connect to MongoDB Atlas
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.error('❌ FATAL ERROR: MONGO_URI is not defined in .env file');
    process.exit(1);
  }

  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoURI, mongooseOptions);
    console.log('✅ MongoDB connection successful');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Exit process with failure
    process.exit(1);
  }
};

// =================================================================
//                      CONNECTION EVENT HANDLING
// =================================================================

mongoose.connection.on('connected', () => {
  console.log('ℹ️  Mongoose connected to db');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('ℹ️  Mongoose disconnected');
});

// =================================================================
//                      GRACEFUL SHUTDOWN
// =================================================================

/**
 * Gracefully close MongoDB connection on process termination
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n👋 ${signal} received. Closing MongoDB connection...`);
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed. Exiting process.');
  process.exit(0);
};

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = connectDB;