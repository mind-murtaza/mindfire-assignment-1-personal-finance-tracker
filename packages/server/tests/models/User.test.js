/**
 * User Model Tests
 * Purpose: Break the User model before users do
 * 
 * Test Strategy:
 * - Boundary testing (edge cases, limits)
 * - Security testing (malicious input, injection attempts)
 * - Data integrity testing (validation, constraints)
 * - Performance testing (large datasets, concurrent operations)
 * - Error handling testing (network failures, corrupted data)
 */

const mongoose = require('mongoose');
const { User } = require('../../src/models');

describe('User Model - Adversarial Testing Suite', () => {
  
  describe('🔒 Security Tests - Input Validation', () => {
    
    it('should reject SQL injection attempts in email', async () => {
      const maliciousEmails = [
        "admin@test.com'; DROP TABLE users; --",
        "admin@test.com' OR '1'='1",
        "admin@test.com<script>alert('xss')</script>",
        "admin@test.com/**/UNION/**/SELECT/**/"
      ];

      for (const email of maliciousEmails) {
        const userData = testUtils.createTestUser({ email });
        
        const user = new User(userData);
        await expect(user.save()).rejects.toThrow(/Invalid email format|email/i);
      }
    });

    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',          // Common password
        '12345678',          // Only numbers
        'abcdefgh',          // Only lowercase
        'ABCDEFGH',          // Only uppercase
        'Pass123',           // No special character
        'Pass@',             // Too short
        'a'.repeat(129),     // Too long
        ''                   // Empty
      ];

      for (const password of weakPasswords) {
        const userData = testUtils.createTestUser({ password });
        
        const user = new User(userData);
        await expect(user.save()).rejects.toThrow();
      }
    });

    it('should reject emails with leading/trailing whitespace', async () => {
      const emailVariations = [
        '  admin@test.com  ',
        ' user@example.com',
        'test@domain.org\n'
      ];

      for (const email of emailVariations) {
        const userData = testUtils.createTestUser({ 
          email: email,
          password: 'ValidPass123!'
        });
        
        const user = new User(userData);
        await expect(user.save()).rejects.toThrow(/Invalid email format/);
      }
    });

    it('should reject malicious script injection in names', async () => {
      const maliciousNames = [
        "<script>alert('xss')</script>",
        "Robert'); DROP TABLE users; --"
      ];

      for (const name of maliciousNames) {
        const userData = testUtils.createTestUser({
          profile: { firstName: name.substring(0, 49), lastName: 'Test' }
        });
        
        const user = new User(userData);
        await expect(user.save()).rejects.toThrow(/can only contain letters/i);
      }
    });
  });

  describe('🎯 Boundary Testing - Field Limits', () => {
    
    it('should enforce email length limits', async () => {
      // Test maximum valid length (254 characters per RFC 5321)
      const maxValidEmail = 'a'.repeat(240) + '@example.com'; // 254 total
      const userData = testUtils.createTestUser({ 
        email: maxValidEmail,
        password: 'ValidPass123!'
      });
      
      const user = new User(userData);
      await expect(user.save()).resolves.toBeDefined();
      await user.deleteOne();

      // Test over the limit
      const tooLongEmail = 'a'.repeat(250) + '@example.com'; // 265 total
      const invalidUserData = testUtils.createTestUser({ email: tooLongEmail });
      
      const invalidUser = new User(invalidUserData);
      await expect(invalidUser.save()).rejects.toThrow(/cannot exceed 254 characters/i);
    });

    it('should enforce name length limits', async () => {
      // Test maximum valid length (50 characters)
      const maxValidName = 'a'.repeat(50);
      const userData = testUtils.createTestUser({
        profile: { firstName: maxValidName, lastName: maxValidName }
      });
      
      const user = new User(userData);
      await expect(user.save()).resolves.toBeDefined();
      await user.deleteOne();

      // Test over the limit
      const tooLongName = 'a'.repeat(51);
      const invalidUserData = testUtils.createTestUser({
        profile: { firstName: tooLongName, lastName: 'Valid' }
      });
      
      const invalidUser = new User(invalidUserData);
      await expect(invalidUser.save()).rejects.toThrow(/cannot exceed 50 characters/i);
    });

    it('should validate user settings correctly', async () => {
      // Test valid theme values
      const validThemes = ['light', 'dark', 'system'];
      for (const theme of validThemes) {
        const userData = testUtils.createTestUser({ settings: { theme } });
        const user = new User(userData);
        await expect(user.save()).resolves.toBeDefined();
        await user.deleteOne();
      }

      // Test invalid theme value
      const invalidThemeData = testUtils.createTestUser({ settings: { theme: 'invalid_theme' } });
      const invalidThemeUser = new User(invalidThemeData);
      await expect(invalidThemeUser.save()).rejects.toThrow(/Invalid option: expected one of "light"|"dark"|"system"/);

      // Test valid currency
      const validCurrencyData = testUtils.createTestUser({ settings: { currency: 'EUR' } });
      const validCurrencyUser = new User(validCurrencyData);
      await expect(validCurrencyUser.save()).resolves.toBeDefined();
      await validCurrencyUser.deleteOne();

      // Test invalid currency
      const invalidCurrencyData = testUtils.createTestUser({ settings: { currency: 'FAKE' } });
      const invalidCurrencyUser = new User(invalidCurrencyData);
      await expect(invalidCurrencyUser.save()).rejects.toThrow(/Unsupported currency code/);

      // Test invalid mobile dial code
      const invalidDialCodeData = testUtils.createTestUser({ settings: { mobileDialCode: '+12345' } });
      const invalidDialCodeUser = new User(invalidDialCodeData);
      await expect(invalidDialCodeUser.save()).rejects.toThrow(/Unsupported mobile dial code/);
    });
  });

  describe('🚀 Performance Tests - Scale & Concurrency', () => {
    
    it('should handle concurrent user creation', async () => {
      const concurrentUsers = Array.from({ length: 10 }, (_, i) => 
        testUtils.createTestUser({
          email: `concurrent${i}@test.com`,
          password: 'ValidPass123!'
        })
      );

      const promises = concurrentUsers.map(userData => {
        const user = new User(userData);
        return user.save();
      });

      const results = await Promise.allSettled(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // Cleanup
      await User.deleteMany({ email: /concurrent\d+@test\.com/ });
    });

    it('should prevent duplicate email registration under race conditions', async () => {
      const email = 'race@test.com';
      const password = 'ValidPass123!';
      
      // Create multiple users with same email simultaneously
      const duplicateUsers = Array.from({ length: 5 }, () => 
        new User(testUtils.createTestUser({ email, password }))
      );

      const promises = duplicateUsers.map(user => user.save());
      const results = await Promise.allSettled(promises);

      // Only one should succeed, others should fail with duplicate key error
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful).toHaveLength(1);
      expect(failed.length).toBeGreaterThan(0);

      // Cleanup
      await User.deleteMany({ email });
    });

    it('should perform efficiently with large result sets', async () => {
      // Create test users with 'active' status (since findActiveUsers looks for active users)
      const testUsers = Array.from({ length: 100 }, (_, i) => 
        testUtils.createTestUser({
          email: `perf${i}@test.com`,
          password: 'ValidPass123!',
          status: 'active'  // Set status to 'active' so findActiveUsers can find them
        })
      );

      await User.insertMany(testUsers);

      // Test pagination performance
      const startTime = Date.now();
      const result = await User.findActiveUsers({ page: 1, limit: 20 });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
      expect(result.users).toHaveLength(20);
      expect(result.total).toBeGreaterThanOrEqual(100);

      // Cleanup
      await User.deleteMany({ email: /perf\d+@test\.com/ });
    });
  });

  describe('💀 Data Corruption Tests - Error Handling', () => {
    
    it('should handle corrupted password hash gracefully', async () => {
      const userData = testUtils.createTestUser({ password: 'ValidPass123!' });
      const user = new User(userData);
      await user.save();

      // Corrupt the password hash directly in database
      await User.updateOne(
        { _id: user._id },
        { $set: { password: 'corrupted_hash' } }
      );

      const corruptedUser = await User.findById(user._id).select('+password');
      
      // Password comparison should fail gracefully by returning false
      await expect(
        corruptedUser.comparePassword('ValidPass123!')
      ).resolves.toBe(false);

      await user.deleteOne();
    });

    it('should handle missing required fields gracefully', async () => {
      const incompleteData = [
        { email: 'test@test.com' }, // Missing password
        { password: 'ValidPass123!' }, // Missing email
        { email: 'test@test.com', password: 'ValidPass123!' }, // Missing profile
        { 
          email: 'test@test.com', 
          password: 'ValidPass123!',
          profile: { firstName: 'John' } // Missing lastName
        }
      ];

      for (const data of incompleteData) {
        const user = new User(data);
        await expect(user.save()).rejects.toThrow(/Invalid input: expected string, received undefined/);
      }
    });
  });

  describe('🧪 Model Architecture Tests - Simplified Validation', () => {
    
    it('should validate only new documents with Zod', async () => {
      // Test that new documents are validated
      const invalidNewUser = new User({
        email: 'invalid-email', // Invalid format
        password: 'weak', // Weak password  
        profile: { firstName: 'Test', lastName: 'User' }
      });
      
      await expect(invalidNewUser.save()).rejects.toThrow(/Invalid email format/);
      
      // Test that valid new documents pass validation
      const validNewUser = new User(testUtils.createTestUser({ password: 'ValidPass123!' }));
      await expect(validNewUser.save()).resolves.toBeDefined();
      await validNewUser.deleteOne();
    });
    
    it('should apply Zod transformations to new documents', async () => {
      const userData = testUtils.createTestUser({ 
        email: 'TEST@EXAMPLE.COM', // Should be lowercased
        password: 'ValidPass123!',
        profile: {
          firstName: 'John', // Valid name (no spaces to trim in names)
          lastName: 'Doe'    // Valid name
        }
      });
      
      const user = new User(userData);
      await user.save();
      
      // Check that email transformation was applied
      expect(user.email).toBe('test@example.com'); // lowercased
      expect(user.profile.firstName).toBe('John');
      expect(user.profile.lastName).toBe('Doe');
      
      await user.deleteOne();
    });
    
    it('should skip validation for updates (API layer responsibility)', async () => {
      // Create valid user first
      const user = new User(testUtils.createTestUser({ password: 'ValidPass123!' }));
      await user.save();
      
      // Update with data that would fail validation if checked
      user.email = 'definitely-not-an-email';  // Invalid email
      user.profile.firstName = '123Numbers';    // Invalid name format
      user.profile.lastName = '';               // Empty name
      
      // Should save without validation errors
      await expect(user.save()).resolves.toBeDefined();
      
      // Verify the invalid data was actually saved
      expect(user.email).toBe('definitely-not-an-email');
      expect(user.profile.firstName).toBe('123Numbers');
      expect(user.profile.lastName).toBe('');
      
      await user.deleteOne();
    });
  });

  describe('🔧 Business Logic Tests - User Operations', () => {
    
    it('should hash password automatically on save', async () => {
      const plainPassword = 'ValidPass123!';
      const userData = testUtils.createTestUser({ password: plainPassword });
      
      const user = new User(userData);
      await user.save();

      // Password should be hashed
      expect(user.password).not.toBe(plainPassword);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format

      // Should be able to compare correctly
      await expect(user.comparePassword(plainPassword)).resolves.toBe(true);
      await expect(user.comparePassword('wrongpassword')).resolves.toBe(false);

      await user.deleteOne();
    });

    it('should not validate updates (validation handled at API layer)', async () => {
      // Create and save a valid user first
      const userData = testUtils.createTestUser({ password: 'ValidPass123!' });
      const user = new User(userData);
      await user.save();

      // Now update with invalid data - should NOT be validated at model level
      user.profile.firstName = 'Invalid123'; // This would fail validation if checked
      user.status = 'invalid_status'; // This would also fail validation
      
      // Updates should succeed without validation (validation happens at API layer)
      await expect(user.save()).resolves.toBeDefined();
      
      // Only password hashing should occur for updates
      expect(user.profile.firstName).toBe('Invalid123');
      expect(user.status).toBe('invalid_status');

      await user.deleteOne();
    });

    it('should still hash password on updates', async () => {
      const userData = testUtils.createTestUser({ password: 'ValidPass123!' });
      const user = new User(userData);
      await user.save();

      const originalHash = user.password;

      // Update password - should be hashed even though no validation occurs
      user.password = 'NewValidPass456!';
      await user.save();

      // Password should be hashed
      expect(user.password).not.toBe('NewValidPass456!');
      expect(user.password).not.toBe(originalHash);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt format

      await user.deleteOne();
    });

    it('should track last login correctly', async () => {
      const userData = testUtils.createTestUser({ password: 'ValidPass123!' });
      const user = new User(userData);
      await user.save();

      expect(user.lastLoginAt).toBeNull();

      const beforeLogin = new Date();
      await user.updateLastLogin();
      const afterLogin = new Date();

      expect(user.lastLoginAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
      expect(user.lastLoginAt.getTime()).toBeLessThanOrEqual(afterLogin.getTime());

      await user.deleteOne();
    });

    it('should handle soft delete properly', async () => {
      // Create a user and save to set initial state
      const user = new User(testUtils.createTestUser({ password: 'ValidPass123!' }));
      await user.save();
      expect(user.status).toBe('pending_verification');

      // Activate user
      user.status = 'active';
      await user.save();
      expect(user.isActive()).toBe(true);

      // Soft delete
      await user.softDelete();
      expect(user.status).toBe('deleted');
      expect(user.isActive()).toBe(false);

      // Should not be found in normal queries
      const foundUser = await User.findByEmail(user.email);
      expect(foundUser).toBeNull();

      await user.deleteOne();
    });
  });

  describe('🎭 Virtual Properties & Methods', () => {
    
    it('should generate correct virtual properties', async () => {
      const userData = testUtils.createTestUser({
        profile: { firstName: 'John', lastName: 'Doe' },
        password: 'ValidPass123!'
      });
      
      const user = new User(userData);
      await user.save();

      expect(user.fullName).toBe('John Doe');
      expect(user.getFullName()).toBe('John Doe');
      expect(user.initials).toBe('JD');

      await user.deleteOne();
    });

    it('should handle edge cases in name formatting', async () => {
      const edgeCases = [
        { first: 'John', last: 'Doe', expected: 'John Doe', initials: 'JD' },
        { first: 'A', last: 'B', expected: 'A B', initials: 'AB' }
      ];

      for (const { first, last, expected, initials } of edgeCases) {
        const userData = testUtils.createTestUser({
          profile: { firstName: first, lastName: last },
          password: 'ValidPass123!'
        });
        
        const user = new User(userData);
        await user.save();

        expect(user.fullName).toBe(expected);
        expect(user.initials).toBe(initials);

        await user.deleteOne();
      }

      // Test for invalid characters
      const invalidName = "Jean-Pierre";
      const invalidUserData = testUtils.createTestUser({
        profile: { firstName: invalidName, lastName: "O'Connor" }
      });
      const invalidUser = new User(invalidUserData);
      await expect(invalidUser.save()).rejects.toThrow(/can only contain letters/);
    });
  });

  describe('🔍 Static Methods - Query Operations', () => {
    
    beforeEach(async () => {
      // Create test users with different statuses
      const users = [
        testUtils.createTestUser({ 
          email: 'active1@test.com', 
          status: 'active',
          password: 'ValidPass123!'
        }),
        testUtils.createTestUser({ 
          email: 'active2@test.com', 
          status: 'active',
          password: 'ValidPass123!'
        }),
        testUtils.createTestUser({ 
          email: 'suspended@test.com', 
          status: 'suspended',
          password: 'ValidPass123!'
        }),
        testUtils.createTestUser({ 
          email: 'deleted@test.com', 
          status: 'deleted',
          password: 'ValidPass123!'
        })
      ];

      await User.insertMany(users);
    });

    it('should find user by email excluding deleted', async () => {
      const activeUser = await User.findByEmail('active1@test.com');
      expect(activeUser).toBeTruthy();
      expect(activeUser.email).toBe('active1@test.com');

      const suspendedUser = await User.findByEmail('suspended@test.com');
      expect(suspendedUser).toBeTruthy();

      const deletedUser = await User.findByEmail('deleted@test.com');
      expect(deletedUser).toBeNull();
    });

        it('should paginate active users correctly', async () => {
      const result = await User.findActiveUsers({ page: 1, limit: 1 });
      
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(2); // Only 2 active users
      expect(result.users[0].status).toBe('active');
    });
  });

  describe('🏆 Integration Tests - Model Relationships', () => {
    
    it('should maintain data integrity across related models', async () => {
      // This will be expanded when Category and Transaction models are tested
      const userData = testUtils.createTestUser({ password: 'ValidPass123!' });
      const user = new User(userData);
      await user.save();

      // Verify user can be referenced by ObjectId
      expect(user._id).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(user._id.toString()).toMatch(/^[0-9a-fA-F]{24}$/);

      await user.deleteOne();
    });
  });

});

/**
 * Additional test utilities specific to User model
 */
const userTestUtils = {
  /**
   * Create a valid user with random data
   */
  createRandomUser: () => {
    const randomId = Math.random().toString(36).substring(7);
    return testUtils.createTestUser({
      email: `user${randomId}@test.com`,
      password: 'ValidPass123!',
      profile: {
        firstName: `First${randomId}`,
        lastName: `Last${randomId}`
      }
    });
  },

  /**
   * Create multiple users for bulk testing
   */
  createBulkUsers: (count) => {
    return Array.from({ length: count }, () => userTestUtils.createRandomUser());
  }
};

module.exports = { userTestUtils };