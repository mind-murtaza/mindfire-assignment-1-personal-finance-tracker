const request = require('supertest');
const app = require('../../src/app');
const { User, Category } = require('../../src/models');

async function registerAndLogin(overrides = {}) {
  const user = { email: 'catuser@test.com', password: 'ValidPass123!', profile: { firstName: 'John', lastName: 'Doe' }, ...overrides };
  await request(app).post('/api/v1/auth/register').send(user).expect(201);
  await User.updateOne({ email: user.email }, { $set: { status: 'active' } });
  const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return { token: res.body.data.token, email: user.email };
}

describe('Categories API - Murtaza\'s Adversarial Testing Suite', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
  });

  describe('🔐 Authentication & Access Control', () => {
    it('should require valid JWT token for category endpoints', async () => {
      await request(app).get('/api/v1/categories').expect(401);
      await request(app).post('/api/v1/categories').send({ name: 'Transport', type: 'expense' }).expect(401);
    });

    it('should reject suspended users', async () => {
      const { token, email } = await registerAndLogin();
      await User.updateOne({ email }, { $set: { status: 'suspended' } });

      await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Transport', type: 'expense' })
        .expect(403);
    });
  });

  describe('🆕 POST /api/v1/categories - Creation & Validation', () => {
    it('should create a category successfully', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Transport', type: 'expense', monthlyBudget: 123.45 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Transport');
      expect(res.body.data.type).toBe('expense');
      expect(res.body.data.isDefault).toBe(false);
      expect(typeof res.body.data.monthlyBudget).toBe('number');
    });

    it('should reject invalid payloads and missing fields', async () => {
      const { token } = await registerAndLogin();

      const badPayloads = [
        {},
        { name: 'Transport' },
        { type: 'expense' },
        { name: '', type: 'expense' },
        { name: 'Transport', type: 'other' },
        { name: 'Transport', type: 'expense', color: 'red' },
        { name: 'Transport', type: 'expense', icon: 'Invalid_Icon' },
        { name: 'Transport', type: 'expense', monthlyBudget: 12.345 },
      ];

      for (const payload of badPayloads) {
        await request(app)
          .post('/api/v1/categories')
          .set('Authorization', `Bearer ${token}`)
          .send(payload)
          .expect(400);
      }
    });

    it('should enforce uniqueness within user and type', async () => {
      const { token } = await registerAndLogin();

      await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Transport', type: 'expense' })
        .expect(201);

      await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Transport', type: 'expense' })
        .expect(400);
    });

    it('should validate parent relationship and depth', async () => {
      const { token } = await registerAndLogin();

      // Create root and child and grandchild (max 3 levels)
      const root = (await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Root', type: 'expense' })
        .expect(201)).body.data;

      const child = (await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child', type: 'expense', parentId: root._id })
        .expect(201)).body.data;

      const grandchild = (await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Grandchild', type: 'expense', parentId: child._id })
        .expect(201)).body.data;

      // Great-grandchild should fail (exceeds 3 levels)
      await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Greatgrandchild', type: 'expense', parentId: grandchild._id })
        .expect(400);

      // Parent type mismatch should fail
      await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'IncomeChild', type: 'income', parentId: root._id })
        .expect(400);
    });
  });

  describe('📜 GET /api/v1/categories - Listing & Hierarchy', () => {
    it('should list categories filtered by type', async () => {
      const { token } = await registerAndLogin();

      await request(app).post('/api/v1/categories').set('Authorization', `Bearer ${token}`).send({ name: 'Transport', type: 'expense' }).expect(201);
      await request(app).post('/api/v1/categories').set('Authorization', `Bearer ${token}`).send({ name: 'SalaryBonus', type: 'income' }).expect(201);

      const resExpense = await request(app).get('/api/v1/categories?type=expense').set('Authorization', `Bearer ${token}`).expect(200);
      const resIncome = await request(app).get('/api/v1/categories?type=income').set('Authorization', `Bearer ${token}`).expect(200);

      expect(Array.isArray(resExpense.body.data)).toBe(true);
      expect(Array.isArray(resIncome.body.data)).toBe(true);
      expect(resExpense.body.data.some(c => c.type === 'expense')).toBe(true);
      expect(resIncome.body.data.some(c => c.type === 'income')).toBe(true);
    });

    it('should return hierarchy for a given type', async () => {
      const { token } = await registerAndLogin();

      const groceries = (await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Groceries', type: 'expense' })
        .expect(201)).body.data;

      await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Vegetables', type: 'expense', parentId: groceries._id })
        .expect(201);

      const res = await request(app)
        .get('/api/v1/categories/hierarchy?type=expense')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      // Root should include Groceries with children
      const root = res.body.data.find(c => c.name === 'Groceries');
      expect(root).toBeDefined();
      expect(Array.isArray(root.children)).toBe(true);
      expect(root.children.some(c => c.name === 'Vegetables')).toBe(true);
    });
  });

  describe('🔍 GET /api/v1/categories/:id - Retrieval', () => {
    it('should fetch a category by id', async () => {
      const { token } = await registerAndLogin();
      const created = (await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Utilities', type: 'expense' })
        .expect(201)).body.data;

      const res = await request(app)
        .get(`/api/v1/categories/${created._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data._id).toBe(created._id);
      expect(res.body.data.name).toBe('Utilities');
    });

    it('should return 404 for non-existent id', async () => {
      const { token } = await registerAndLogin();
      const fakeId = '64b8f7f3c2a0a9b1c2d3e4f5';
      await request(app)
        .get(`/api/v1/categories/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('✏️ PATCH /api/v1/categories/:id - Updates', () => {
    it('should update editable fields', async () => {
      const { token } = await registerAndLogin();
      const created = (await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bills', type: 'expense' })
        .expect(201)).body.data;

      const res = await request(app)
        .patch(`/api/v1/categories/${created._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'BillsUpdated', color: '#123ABC', icon: 'tag', monthlyBudget: 250.5 })
        .expect(200);

      expect(res.body.data.name).toBe('BillsUpdated');
      expect(res.body.data.color).toBe('#123ABC');
      expect(typeof res.body.data.monthlyBudget).toBe('number');
    });

    it('should reject forbidden updates', async () => {
      const { token } = await registerAndLogin();
      const created = (await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sub', type: 'expense' })
        .expect(201)).body.data;

      await request(app)
        .patch(`/api/v1/categories/${created._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'income' })
        .expect(400);

      await request(app)
        .patch(`/api/v1/categories/${created._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ parentId: created._id })
        .expect(400);
    });

    it('should enforce name uniqueness on rename', async () => {
      const { token } = await registerAndLogin();
      const a = (await request(app).post('/api/v1/categories').set('Authorization', `Bearer ${token}`).send({ name: 'CatA', type: 'expense' }).expect(201)).body.data;
      const b = (await request(app).post('/api/v1/categories').set('Authorization', `Bearer ${token}`).send({ name: 'CatB', type: 'expense' }).expect(201)).body.data;

      await request(app)
        .patch(`/api/v1/categories/${b._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'CatA' })
        .expect(400);
    });
  });

  describe('⭐ Default Category - Set & Uniqueness', () => {
    it('should set a category as default and unset previous default in same type', async () => {
      const { token } = await registerAndLogin();

      const c1 = (await request(app).post('/api/v1/categories').set('Authorization', `Bearer ${token}`).send({ name: 'Coffee', type: 'expense' }).expect(201)).body.data;
      const c2 = (await request(app).post('/api/v1/categories').set('Authorization', `Bearer ${token}`).send({ name: 'Cinema', type: 'expense' }).expect(201)).body.data;

      // Use dedicated endpoint
      await request(app)
        .patch(`/api/v1/categories/${c1._id}/set-default`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app)
        .patch(`/api/v1/categories/${c2._id}/set-default`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const all = await Category.find({ isDeleted: false, type: 'expense' });
      const defaults = all.filter(c => c.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].name).toBe('Cinema');
    });
  });

  describe('🗑️ DELETE /api/v1/categories/:id - Soft Delete', () => {
    it('should soft delete category and allow reusing the name', async () => {
      const { token } = await registerAndLogin();
      const created = (await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Disposable', type: 'expense' })
        .expect(201)).body.data;

      await request(app)
        .delete(`/api/v1/categories/${created._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Recreate with same name should succeed (soft-deleted excluded from uniqueness)
      await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Disposable', type: 'expense' })
        .expect(201);
    });
  });
});


