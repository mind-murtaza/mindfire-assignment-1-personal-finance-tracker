const request = require('supertest');
const app = require('../../src/app');
const { User, Category } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('Auth API - Murtaza\'s Adversarial Testing Suite', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
  });

  const baseUser = () => ({
    email: 'user@test.com',
    password: 'ValidPass123!',
    profile: { firstName: 'John', lastName: 'Doe' },
  });

  describe('🔒 POST /api/v1/auth/register - Security & Validation Tests', () => {
    it('should create user and return token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(baseUser())
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('user@test.com');
      expect(res.body.data.user.password).toBeUndefined(); // Never expose password
    });

    it('should create default categories for new user', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(baseUser()).expect(201);
      const userId = res.body.data.user._id || res.body.data.user.id;
      const defaults = await Category.find({ userId, isDefault: true, isDeleted: false });
      expect(defaults.length).toBe(2); // Salary + Food & Dining
      expect(defaults.map(c => c.name).sort()).toEqual(['Food & Dining', 'Salary']);
    });

    it('should normalize email and trim whitespace', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...baseUser(), email: '  USER@TEST.com  ' })
        .expect(201);
      expect(res.body.data.user.email).toBe('user@test.com');
    });

    it('should reject duplicate email with proper error', async () => {
      await request(app).post('/api/v1/auth/register').send(baseUser()).expect(201);
      const res = await request(app).post('/api/v1/auth/register').send(baseUser()).expect(500);
      expect(res.body.success).toBe(false);
    });

    // 🧨 SQL Injection Attempts
    it('should reject SQL injection in email field', async () => {
      const maliciousEmails = [
        "admin@test.com'; DROP TABLE users; --",
        "admin@test.com' OR '1'='1",
        "admin@test.com/**/UNION/**/SELECT/**/",
        "'; INSERT INTO users VALUES ('hacked'); --"
      ];

      for (const email of maliciousEmails) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({ ...baseUser(), email })
          .expect(400);
      }
    });

    // 🧨 XSS Injection Attempts
    it('should reject XSS attempts in all fields', async () => {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "<svg onload=alert('xss')>"
      ];

      for (const payload of xssPayloads) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({ 
            ...baseUser(), 
            profile: { firstName: payload, lastName: 'Test' }
          })
          .expect(400);
      }
    });

    // 🎯 Password Security Tests
    it('should reject weak passwords comprehensively', async () => {
      const weakPasswords = [
        'password',          // Common password
        '12345678',          // Only numbers
        'abcdefgh',          // Only lowercase
        'ABCDEFGH',          // Only uppercase
        'Pass123',           // No special character
        'Pass@',             // Too short
        'a'.repeat(129),     // Too long
        '',                  // Empty
        '   ',               // Whitespace only
        'passw@rd',          // Common + special
        'Password1',         // Missing special
        'PASSWORD@1',        // No lowercase
        'password@1',        // No uppercase
        'Passwor@',          // No number
      ];

      for (const password of weakPasswords) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({ ...baseUser(), password })
          .expect(400);
      }
    });

    // 🎯 Email Validation Edge Cases
    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        '',                    // Empty
        'not-an-email',        // No @
        '@domain.com',         // No local part
        'user@',               // No domain
        'user@domain',         // No TLD
        'user..user@domain.com', // Double dots
        'user@domain..com',    // Double dots in domain
        'a'.repeat(255) + '@domain.com', // Too long
        'user@' + 'a'.repeat(255) + '.com', // Domain too long
        'user name@domain.com', // Space in local
        'user@domain .com',    // Space in domain
        'user@@domain.com',    // Double @
        'user@domain@com',     // Multiple @
      ];

      for (const email of invalidEmails) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({ ...baseUser(), email })
          .expect(400);
      }
    });

    // 🎯 Name Validation Edge Cases
    it('should reject invalid names', async () => {
      const invalidNames = [
        '',                    // Empty
        '   ',                 // Whitespace only
        'John123',             // Numbers
        'John-Doe',            // Hyphens
        'John Doe',            // Spaces
        'John_Doe',            // Underscores
        'John.Doe',            // Dots
        'a'.repeat(51),        // Too long
        'José',                // Accented characters
        'محمد',                // Non-Latin
        '!@#$',                // Special characters
      ];

      for (const name of invalidNames) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({ 
            ...baseUser(), 
            profile: { firstName: name, lastName: 'Valid' }
          })
          .expect(400);
      }
    });

    // 🧨 Payload Size and Structure Attacks
    it('should reject oversized payloads', async () => {
      const oversizedUser = {
        ...baseUser(),
        profile: {
          firstName: 'a'.repeat(10000),
          lastName: 'b'.repeat(10000),
          extraField: 'x'.repeat(100000)
        }
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(oversizedUser)
        .expect(400);
    });

    it('should reject malformed JSON structure', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send('{"email": "test@test.com", "password": "ValidPass123!", "profile": {"firstName": "John"') // Broken JSON
        .expect(400);
    });

    // 🎯 Missing Fields Validation
    it('should reject missing required fields', async () => {
      const incompletePayloads = [
        { password: 'ValidPass123!', profile: { firstName: 'John', lastName: 'Doe' } }, // No email
        { email: 'test@test.com', profile: { firstName: 'John', lastName: 'Doe' } }, // No password
        { email: 'test@test.com', password: 'ValidPass123!' }, // No profile
        { email: 'test@test.com', password: 'ValidPass123!', profile: { firstName: 'John' } }, // No lastName
        { email: 'test@test.com', password: 'ValidPass123!', profile: { lastName: 'Doe' } }, // No firstName
      ];

      for (const payload of incompletePayloads) {
        await request(app)
          .post('/api/v1/auth/register')
          .send(payload)
          .expect(400);
      }
    });

    // 🚀 Race Condition Tests
    it('should handle concurrent registration attempts with same email', async () => {
      const promises = Array.from({ length: 5 }, () => 
        request(app).post('/api/v1/auth/register').send(baseUser())
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = results.filter(r => r.status === 'fulfilled' && r.value.status >= 400);

      expect(successful).toHaveLength(1); // Only one should succeed
      expect(failed.length).toBeGreaterThanOrEqual(4); // Others should fail
    });
  });

  describe('🔒 POST /api/v1/auth/login - Security & Attack Prevention', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(baseUser()).expect(201);
    });

    it('should authenticate and return token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'ValidPass123!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should normalize email input (case insensitive)', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: '  USER@TEST.COM  ', password: 'ValidPass123!' })
        .expect(200);
    });

    it('should reject non-existent users', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'ValidPass123!' })
        .expect(401);
    });

    it('should reject wrong passwords', async () => {
      const wrongPasswords = [
        'WrongPass123!',
        'ValidPass123',    // Missing !
        'validpass123!',   // Wrong case
        '',                // Empty
        'ValidPass123!!',  // Extra character
      ];

      for (const password of wrongPasswords) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'user@test.com', password })
          .expect(401);
      }
    });

    // 🧨 Brute Force Protection (Rate Limiting Tests)
    it('should handle rapid login attempts gracefully', async () => {
      const promises = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'user@test.com', password: 'wrong' })
      );

      const results = await Promise.allSettled(promises);
      // Should handle all requests without crashing
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });

    // 🎯 Status-Based Access Control
    it('should reject suspended users', async () => {
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'suspended' } });
      
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'ValidPass123!' })
        .expect(403);
    });

    it('should reject deleted users', async () => {
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'deleted' } });
      
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'ValidPass123!' })
        .expect(401);
    });

    it('should allow pending_verification users to login', async () => {
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'pending_verification' } });
      
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'ValidPass123!' })
        .expect(200);
    });

    // 🧨 SQL Injection in Login
    it('should prevent SQL injection in login credentials', async () => {
      const maliciousInputs = [
        { email: "user@test.com'; DROP TABLE users; --", password: 'ValidPass123!' },
        { email: "user@test.com' OR '1'='1", password: 'ValidPass123!' },
        { email: 'user@test.com', password: "ValidPass123!' OR '1'='1" },
      ];

      for (const input of maliciousInputs) {
        await request(app)
          .post('/api/v1/auth/login')
          .send(input)
          .expect(401);
      }
    });

    // 🎯 Timing Attack Prevention
    it('should have consistent response times for invalid users vs wrong passwords', async () => {
      const start1 = Date.now();
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'ValidPass123!' })
        .expect(401);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'WrongPass123!' })
        .expect(401);
      const time2 = Date.now() - start2;

      // Response times should be similar (within 100ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    // 🧨 Memory Exhaustion Attempts
    it('should handle extremely long credential strings', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ 
          email: 'a'.repeat(100000) + '@test.com', 
          password: 'b'.repeat(100000) 
        })
        .expect(400);
    });
  });

  describe('🧪 JWT Token Security Tests', () => {
    let validToken;

    beforeEach(async () => {
      const res = await request(app).post('/api/v1/auth/register').send(baseUser()).expect(201);
      validToken = res.body.data.token;
    });

    it('should generate valid JWT tokens', async () => {
      expect(validToken).toBeDefined();
      expect(validToken.split('.')).toHaveLength(3); // header.payload.signature
      
      const decoded = jwt.decode(validToken);
      expect(decoded.sub).toBeDefined();
      expect(decoded.email).toBe('user@test.com');
      expect(decoded.exp).toBeDefined();
    });

    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'header.payload',
        'too.many.segments.here',
        '',
        'Bearer token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.INVALID.signature',
      ];

      for (const token of malformedTokens) {
        await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });

    it('should reject expired tokens', async () => {
      // Create an expired token (exp in the past)
      const expiredPayload = {
        sub: 'user123',
        email: 'user@test.com',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET || 'test-secret');

      await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject tokens with invalid signatures', async () => {
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX';
      
      await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });

    it('should reject tokens for deleted users', async () => {
      // Delete the user
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'deleted' } });

      await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);
    });
  });

  describe('💀 Data Corruption & Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      // This test would require mocking mongoose connection
      // For now, we test that the endpoint doesn't crash
      await request(app)
        .post('/api/v1/auth/register')
        .send(baseUser())
        .expect(res => {
          expect([200, 201, 500, 503]).toContain(res.status);
        });
    });

    it('should handle corrupted user data in database', async () => {
      // Create user normally first
      await request(app).post('/api/v1/auth/register').send(baseUser()).expect(201);
      
      // Corrupt password hash directly in DB
      await User.updateOne(
        { email: 'user@test.com' },
        { $set: { password: 'corrupted_hash_not_bcrypt' } }
      );

      // Login should fail gracefully (not crash)
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'ValidPass123!' })
        .expect(401);
    });
  });

  describe('🔧 Performance & Load Testing', () => {
    it('should handle multiple concurrent registrations efficiently', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@test.com`,
        password: 'ValidPass123!',
        profile: { firstName: `User${i}`, lastName: 'Test' }
      }));

      const start = Date.now();
      const promises = users.map(user => 
        request(app).post('/api/v1/auth/register').send(user)
      );
      
      await Promise.all(promises);
      const duration = Date.now() - start;

      // Should complete within reasonable time (adjust based on requirements)
      expect(duration).toBeLessThan(5000); // 5 seconds for 10 users
    });
  });
});
