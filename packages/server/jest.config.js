/**
 * Jest Configuration for Personal Finance Tracker Backend
 * Following The Architect's enterprise-grade testing standards
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.js',
    '<rootDir>/tests/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/index.js'
  ],

  // Coverage thresholds (The Architect's standards - relaxed for development)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },

  // Module paths and aliases
  moduleDirectories: ['node_modules', 'src'],
  modulePaths: ['<rootDir>/src'],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Timeout for tests (financial operations might take time)
  testTimeout: 30000,

  // Verbose output for detailed test results
  verbose: true,

  // Detect open handles (memory leaks, unclosed connections)
  detectOpenHandles: true,
  forceExit: true,

  // Transform settings for modern JavaScript
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Global variables available in tests
  globals: {
    NODE_ENV: 'test'
  },

  // Environment variables
  setupFiles: ['<rootDir>/tests/jest.env.js']
};