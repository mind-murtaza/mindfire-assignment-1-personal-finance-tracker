/**
 * Test Setup - MongoDB Memory Server & Global Test Configuration
 * The Architect's enterprise-grade testing environment setup
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Setup MongoDB Memory Server before all tests
 * This creates an isolated in-memory MongoDB instance for testing
 */
beforeAll(async () => {
  try {
    // Create MongoDB Memory Server instance with longer timeout
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '6.0.0', // Use MongoDB 6.0 for better compatibility
        downloadDir: '/tmp/mongodb-binaries',
      },
      instance: {
        dbName: 'finance-tracker-test',
        port: 0, // Use random available port
      },
    });

    // Get the URI for the in-memory database
    const mongoUri = mongoServer.getUri();

    // Connect mongoose to the in-memory database
    await mongoose.connect(mongoUri, {
      bufferCommands: false, // Disable mongoose buffering for testing
      maxPoolSize: 1, // Limit connection pool for testing
      serverSelectionTimeoutMS: 30000, // Increase timeout
      socketTimeoutMS: 30000,
    });

    console.log('🚀 Test database connected successfully');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    process.exit(1);
  }
}, 60000); // 60 second timeout for setup

/**
 * Clean up after each test
 * This ensures test isolation and prevents data bleeding between tests
 */
afterEach(async () => {
  try {
    // Only clean if connection is ready
    if (mongoose.connection.readyState === 1) {
      // Get all collections
      const collections = mongoose.connection.collections;

      // Clear all collections with timeout handling
      const cleanup = Object.keys(collections).map(async (key) => {
        try {
          await collections[key].deleteMany({}, { timeout: 5000 });
        } catch (err) {
          // Ignore cleanup errors during tests
          if (process.env.NODE_ENV !== 'test') {
            console.warn(`Failed to clean collection ${key}:`, err.message);
          }
        }
      });

      await Promise.allSettled(cleanup);
    }
  } catch (error) {
    // Silently ignore cleanup errors in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.error('❌ Failed to clean test database:', error);
    }
  }
}, 10000); // 10 second timeout for cleanup

/**
 * Cleanup after all tests
 * Properly close connections and stop the in-memory server
 */
afterAll(async () => {
  try {
    // Close mongoose connection
    await mongoose.connection.close();

    // Stop the in-memory MongoDB server
    if (mongoServer) {
      await mongoServer.stop();
    }

    console.log('🛑 Test database cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  }
});

/**
 * Global test timeout
 * Set to 10 seconds for database operations
 */
jest.setTimeout(10000);

/**
 * Suppress MongoDB deprecation warnings in test output
 */
process.env.SUPPRESS_NO_CONFIG_WARNING = 'true';

/**
 * Test utilities for The Architect's testing standards
 */
global.testUtils = {
  /**
   * Create a test user for testing purposes
   */
  createTestUser: (overrides = {}) => ({
    email: 'test@example.com',
    password: 'ValidPass123!',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    settings: {
      mobileDialCode: '+91',
      currency: 'INR',
      theme: 'system',
    },
    status: 'pending_verification', // Match schema default
    ...overrides,
  }),

  /**
   * Generate random ObjectId for testing
   */
  generateObjectId: () => new mongoose.Types.ObjectId(),

  /**
   * Wait for async operations to complete
   */
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
};

module.exports = {
  mongoServer,
  testUtils: global.testUtils,
};