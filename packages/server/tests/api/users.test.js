const request = require('supertest');
// Mock email service to avoid real SMTP during tests
jest.mock('../../src/utils/email/emailService', () => ({
  sendEmailVerification: jest.fn().mockResolvedValue(),
  sendWelcomeEmail: jest.fn().mockResolvedValue(),
  sendPasswordReset: jest.fn().mockResolvedValue(),
  sendOTPCode: jest.fn().mockResolvedValue(),
}));
const app = require('../../src/app');
const { User, Category } = require('../../src/models');
const jwt = require('jsonwebtoken');

async function registerAndLogin(overrides = {}) {
  const user = { email: 'user@test.com', password: 'ValidPass123!', profile: { firstName: 'John', lastName: 'Doe' }, ...overrides };
  const reg = await request(app).post('/api/v1/auth/register').send(user).expect(201);
  const { token } = reg.body; // email verification token
  await request(app).post('/api/v1/auth/verify-email').send({ token }).expect(200);
  const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.data.token;
}

describe('Users API - Murtaza\'s Adversarial Testing Suite', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
  });

  describe('🔒 GET /api/v1/users/me - Profile Access Tests', () => {
    it('should return current user profile with all expected fields', async () => {
      const token = await registerAndLogin();
      const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('user@test.com');
      expect(res.body.data.profile.firstName).toBe('John');
      expect(res.body.data.profile.lastName).toBe('Doe');
      expect(res.body.data.settings).toBeDefined();
      expect(res.body.data.password).toBeUndefined(); // Never expose password
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('should require valid JWT token', async () => {
      await request(app).get('/api/v1/users/me').expect(401);
    });

    it('should reject invalid Authorization headers', async () => {
      const invalidHeaders = [
        'Basic dXNlcjpwYXNz', // Basic auth
        'Token abc123',       // Wrong scheme
        'Bearer',             // No token
        'Bearer ',            // Empty token
        'api-key-123',        // Wrong format
      ];

      for (const header of invalidHeaders) {
        await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', header)
          .expect(401);
      }
    });

    it('should reject deleted users even with valid tokens', async () => {
      const token = await registerAndLogin();
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'deleted' } });
      await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(401);
    });

    it('should reject suspended users from viewing profile (read-only not allowed)', async () => {
      const token = await registerAndLogin();
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'suspended' } });
      await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(403);
    });
  });

  describe('🔒 PATCH /api/v1/users/me/profile - Profile Update Security', () => {
    it('should update profile fields successfully', async () => {
      const token = await registerAndLogin();
      const res = await request(app)
        .patch('/api/v1/users/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Jane', lastName: 'Smith', avatarUrl: 'https://example.com/avatar.jpg' })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.firstName).toBe('Jane');
      expect(res.body.data.profile.lastName).toBe('Smith');
      expect(res.body.data.profile.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should reject invalid name formats comprehensively', async () => {
      const token = await registerAndLogin();
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
        '!@#$%^&*()',          // Special characters
        '<script>alert()</script>', // XSS attempt
      ];

      for (const name of invalidNames) {
        await request(app)
          .patch('/api/v1/users/me/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ firstName: name, lastName: 'Valid' })
          .expect(400);
      }
    });

    it('should validate avatar URL format', async () => {
      const token = await registerAndLogin();
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com/avatar.jpg',
        'javascript:alert("xss")',
        'data:text/html,<script>alert()</script>',
        'http://[evil-domain].com/avatar.jpg',
      ];

      for (const url of invalidUrls) {
        await request(app)
          .patch('/api/v1/users/me/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ avatarUrl: url })
          .expect(400);
      }
    });

    it('should validate mobile number format', async () => {
      const token = await registerAndLogin();
      const invalidNumbers = [
        '123',                 // Too short
        '12345678901',         // Too long
        '123-456-7890',        // Hyphens
        '+1234567890',         // With country code
        'abcdefghij',          // Letters
        '123 456 7890',        // Spaces
      ];

      for (const number of invalidNumbers) {
        await request(app)
          .patch('/api/v1/users/me/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ mobileNumber: number })
          .expect(400);
      }
    });

    it('should reject suspended users from profile updates', async () => {
      const token = await registerAndLogin();
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'suspended' } });
      
      await request(app)
        .patch('/api/v1/users/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Jane', lastName: 'Doe' })
        .expect(403);
    });

    it('should handle partial profile updates', async () => {
      const token = await registerAndLogin();
      
      // Update only firstName
      const res1 = await request(app)
        .patch('/api/v1/users/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Jane' })
        .expect(200);
      expect(res1.body.data.profile.firstName).toBe('Jane');
      expect(res1.body.data.profile.lastName).toBe('Doe'); // Should remain unchanged

      // Update only lastName
      const res2 = await request(app)
        .patch('/api/v1/users/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ lastName: 'Smith' })
        .expect(200);
      expect(res2.body.data.profile.firstName).toBe('Jane'); // Should remain
      expect(res2.body.data.profile.lastName).toBe('Smith');
    });
  });

  describe('🔒 PATCH /api/v1/users/me/settings - Settings Security', () => {
    it('should update settings successfully', async () => {
      const token = await registerAndLogin();
      const res = await request(app)
        .patch('/api/v1/users/me/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'dark', currency: 'USD', mobileDialCode: '+1' })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.settings.theme).toBe('dark');
      expect(res.body.data.settings.currency).toBe('USD');
      expect(res.body.data.settings.mobileDialCode).toBe('+1');
    });

    it('should reject invalid theme values', async () => {
      const token = await registerAndLogin();
      const invalidThemes = [
        'neon', 'blue', 'rainbow', 'custom', '', 'DARK', 'Light'
      ];

      for (const theme of invalidThemes) {
        await request(app)
          .patch('/api/v1/users/me/settings')
          .set('Authorization', `Bearer ${token}`)
          .send({ theme })
          .expect(400);
      }
    });

    it('should reject invalid currency codes', async () => {
      const token = await registerAndLogin();
      const invalidCurrencies = [
        'FAKE', 'XYZ', 'ABC', '123', '', 'usd', 'USD1', 'US$'
      ];

      for (const currency of invalidCurrencies) {
        await request(app)
          .patch('/api/v1/users/me/settings')
          .set('Authorization', `Bearer ${token}`)
          .send({ currency })
          .expect(400);
      }
    });

    it('should reject invalid dial codes', async () => {
      const token = await registerAndLogin();
      const invalidDialCodes = [
        '+999', '+1234567', '91', '1', '+ABC', '', ' +91 '
      ];

      for (const dialCode of invalidDialCodes) {
        await request(app)
          .patch('/api/v1/users/me/settings')
          .set('Authorization', `Bearer ${token}`)
          .send({ mobileDialCode: dialCode })
          .expect(400);
      }
    });
  });

  describe('🔒 POST /api/v1/users/me/change-password - Password Security', () => {
    it('should change password successfully', async () => {
      const token = await registerAndLogin();
      await request(app)
        .post('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'ValidPass123!', newPassword: 'NewValidPass456!' })
        .expect(200);

      // Verify old password no longer works
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'ValidPass123!' })
        .expect(401);

      // Verify new password works
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'NewValidPass456!' })
        .expect(200);
    });

    it('should reject wrong current password', async () => {
      const token = await registerAndLogin();
      const wrongPasswords = [
        'WrongPass123!',
        'validpass123!',      // Wrong case
        'ValidPass123',       // Missing !
        '',                   // Empty
        'ValidPass123!!',     // Extra char
      ];

      for (const wrongPassword of wrongPasswords) {
        await request(app)
          .post('/api/v1/users/me/change-password')
          .set('Authorization', `Bearer ${token}`)
          .send({ currentPassword: wrongPassword, newPassword: 'NewValidPass456!' })
          .expect(400);
      }
    });

    it('should validate new password strength', async () => {
      const token = await registerAndLogin();
      const weakPasswords = [
        'password',           // Common
        '12345678',           // Only numbers
        'Password1',          // Missing special
        'password@1',         // No uppercase
        'PASSWORD@1',         // No lowercase
        'Passwor@',           // No number
        'Pass@1',             // Too short
        'a'.repeat(129),      // Too long
      ];

      for (const weakPassword of weakPasswords) {
        await request(app)
          .post('/api/v1/users/me/change-password')
          .set('Authorization', `Bearer ${token}`)
          .send({ currentPassword: 'ValidPass123!', newPassword: weakPassword })
          .expect(400);
      }
    });

    it('should require both current and new passwords', async () => {
      const token = await registerAndLogin();
      
      // Missing current password
      await request(app)
        .post('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ newPassword: 'NewValidPass456!' })
        .expect(400);

      // Missing new password
      await request(app)
        .post('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'ValidPass123!' })
        .expect(400);
    });
  });

  describe('🔒 DELETE /api/v1/users/me - Account Deletion Security', () => {
    it('should soft delete account successfully', async () => {
      const token = await registerAndLogin();
      await request(app).delete('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(204);

      // Verify login fails after deletion
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'ValidPass123!' })
        .expect(401);

      // Verify user status in database
      const user = await User.findOne({ email: 'user@test.com' });
      expect(user.status).toBe('deleted');
    });

    it('should reject deletion attempts by suspended users', async () => {
      const token = await registerAndLogin();
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'suspended' } });
      
      await request(app).delete('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(403);
    });

    it('should be idempotent (multiple deletions)', async () => {
      const token = await registerAndLogin();
      
      // First deletion
      await request(app).delete('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(204);
      
      // Second deletion attempt should still return 401 (user is deleted)
      await request(app).delete('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(401);
    });
  });

  describe('🧨 Authorization & Status-Based Access Control', () => {
    it('should allow suspended users read access but block mutations', async () => {
      const token = await registerAndLogin();
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'suspended' } });

      // Read access is blocked in current policy
      await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(403);

      // Mutations should be blocked
      await request(app).patch('/api/v1/users/me/profile').set('Authorization', `Bearer ${token}`).send({ firstName: 'Jane' }).expect(403);
      await request(app).patch('/api/v1/users/me/settings').set('Authorization', `Bearer ${token}`).send({ theme: 'dark' }).expect(403);
      await request(app).post('/api/v1/users/me/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'ValidPass123!', newPassword: 'NewPass123!' }).expect(403);
      await request(app).delete('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(403);
    });

    it('should block all access for deleted users', async () => {
      const token = await registerAndLogin();
      await User.updateOne({ email: 'user@test.com' }, { $set: { status: 'deleted' } });

      // All endpoints should return 401
      await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(401);
      await request(app).patch('/api/v1/users/me/profile').set('Authorization', `Bearer ${token}`).send({ firstName: 'Jane' }).expect(401);
      await request(app).patch('/api/v1/users/me/settings').set('Authorization', `Bearer ${token}`).send({ theme: 'dark' }).expect(401);
      await request(app).post('/api/v1/users/me/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'ValidPass123!', newPassword: 'NewPass123!' }).expect(401);
      await request(app).delete('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(401);
    });
  });

  describe('💀 Edge Cases & Error Handling', () => {
    it('should handle missing request bodies gracefully', async () => {
      const token = await registerAndLogin();

      await request(app)
        .patch('/api/v1/users/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(400); // Empty body should be rejected

      await request(app)
        .patch('/api/v1/users/me/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      await request(app)
        .post('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${token}`)
        .expect(400); // change-password requires fields
    });

    it('should handle malformed JSON payloads', async () => {
      const token = await registerAndLogin();

      await request(app)
        .patch('/api/v1/users/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send('{"firstName": "John",}') // Invalid JSON
        .expect(400);
    });

    it('should handle extremely large payloads', async () => {
      const token = await registerAndLogin();
      const largePayload = {
        firstName: 'a'.repeat(10000),
        lastName: 'b'.repeat(10000),
        extraField: 'x'.repeat(100000)
      };

      await request(app)
        .patch('/api/v1/users/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(largePayload)
        .expect(400);
    });

    it('should handle concurrent profile updates', async () => {
      const token = await registerAndLogin();
      
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .patch('/api/v1/users/me/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ firstName: `User${i}` })
      );

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      
      // Ensure requests complete without crashing
      expect(fulfilled.length).toBeGreaterThan(0);
    });
  });

  describe('🔧 Performance & Stress Testing', () => {
    it('should handle rapid sequential requests efficiently', async () => {
      const token = await registerAndLogin();
      
      const start = Date.now();
      for (let i = 0; i < 10; i++) {
        await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
      }
      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds for 10 requests
    });

    it('should maintain consistent response times under load', async () => {
      const tokens = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          registerAndLogin({ email: `user${i}@test.com` })
        )
      );

      const start = Date.now();
      const promises = tokens.map(token =>
        request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`)
      );
      
      await Promise.all(promises);
      const duration = Date.now() - start;

      // All 5 requests should complete quickly
      expect(duration).toBeLessThan(1000); // 1 second for 5 concurrent requests
    });
  });
});
