/**
 * @fileoverview Transaction Model - Enterprise-Grade Adversarial Testing Suite
 * @module tests/models/Transaction
 * @author Murtaza
 * @version 1.0.0
 * @since 1.0.0
 *
 * Testing Strategy:
 * - Security & Input Validation (Zod schema)
 * - Business Logic Validation (Mongoose middleware)
 * - Relational Integrity (User, Category)
 * - Performance & Concurrency
 * - Adversarial Edge Cases
 */

const mongoose = require('mongoose');
const { Transaction, User, Category } = require('../../src/models');

const { testUtils } = global;

describe('Transaction Model - Murtaza\'s Adversarial Testing Suite', () => {
  // GLOBAL TEST ENTITIES - Never deleted, always available
  let testUser1, testUser2;
  let user1IncomeCategory, user1ExpenseCategory, user1ExpenseSubCategory;
  let user2IncomeCategory, user2ExpenseCategory, user2ExpenseSubCategory;

  beforeAll(async () => {
    // Clean everything first to avoid interference
    await Transaction.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({});
    
    // === CREATE 2 GLOBAL USERS ===
    testUser1 = new User(testUtils.createTestUser({ email: 'test-user-1@test.com' }));
    await testUser1.save();
    
    testUser2 = new User(testUtils.createTestUser({ email: 'test-user-2@test.com' }));
    await testUser2.save();

    // === CREATE 3 CATEGORIES FOR USER 1 ===
    user1IncomeCategory = new Category({
      userId: testUser1._id,
      name: 'Salary',
      type: 'income',
    });
    await user1IncomeCategory.save();

    user1ExpenseCategory = new Category({
      userId: testUser1._id,
      name: 'Food & Dining',
      type: 'expense',
    });
    await user1ExpenseCategory.save();

    user1ExpenseSubCategory = new Category({
        userId: testUser1._id,
        name: 'Groceries',
        type: 'expense',
        parentId: user1ExpenseCategory._id,
    });
    await user1ExpenseSubCategory.save();
    
    // === CREATE 3 CATEGORIES FOR USER 2 ===
    user2IncomeCategory = new Category({
      userId: testUser2._id,
      name: 'Freelance',
      type: 'income',
    });
    await user2IncomeCategory.save();

    user2ExpenseCategory = new Category({
      userId: testUser2._id,
      name: 'Transportation',
      type: 'expense',
    });
    await user2ExpenseCategory.save();

    user2ExpenseSubCategory = new Category({
        userId: testUser2._id,
        name: 'Gas',
        type: 'expense',
        parentId: user2ExpenseCategory._id,
    });
    await user2ExpenseSubCategory.save();
  });

  afterAll(async () => {
    // Clean up ALL test data we created
    await Transaction.deleteMany({ 
      userId: { $in: [testUser1._id, testUser2._id] } 
    });
    await Category.deleteMany({ 
      userId: { $in: [testUser1._id, testUser2._id] } 
    });
    await User.deleteMany({ 
      _id: { $in: [testUser1._id, testUser2._id] } 
    });
  });


  // Helper function to create valid transaction data  
  const createValidTransactionData = (overrides = {}) => ({
    userId: testUser1._id,  // Default to testUser1
    categoryId: user1ExpenseCategory._id,  // Default to user1's expense category
    amount: 25.50,
    description: 'Test transaction',
    transactionDate: new Date('2025-01-15T10:00:00.000Z'),
    type: 'expense',
    tags: ['test'],
    ...overrides
  });

  beforeEach(async () => {
    // Clean only transactions (keep users & categories)
    await Transaction.deleteMany({});
    
    // ENSURE categories still exist (recreate if missing due to race conditions)
    const categoryCount = await Category.countDocuments({
      userId: { $in: [testUser1._id, testUser2._id] }
    });
    
    if (categoryCount < 6) {
      // Delete any existing categories and recreate all
      await Category.deleteMany({ userId: { $in: [testUser1._id, testUser2._id] } });
      
      // Recreate all categories
      user1IncomeCategory = await Category.create({
        userId: testUser1._id,
        name: 'Salary',
        type: 'income',
      });
      
      user1ExpenseCategory = await Category.create({
        userId: testUser1._id,
        name: 'Food & Dining',
        type: 'expense',
      });
      
      user1ExpenseSubCategory = await Category.create({
        userId: testUser1._id,
        name: 'Groceries',
        type: 'expense',
        parentId: user1ExpenseCategory._id,
      });
      
      user2IncomeCategory = await Category.create({
        userId: testUser2._id,
        name: 'Freelance',
        type: 'income',
      });
      
      user2ExpenseCategory = await Category.create({
        userId: testUser2._id,
        name: 'Transportation',
        type: 'expense',
      });
      
      user2ExpenseSubCategory = await Category.create({
        userId: testUser2._id,
        name: 'Gas',
        type: 'expense',
        parentId: user2ExpenseCategory._id,
      });
    }
  });

  // =================================================================
  //                    🔒 SECURITY & INPUT VALIDATION
  // =================================================================
  
  describe('🔒 Security & Input Validation - Zod Schema Tests', () => {
    
    describe('Amount Validation', () => {
      it('should reject amounts less than 0.01', async () => {
        const tx = new Transaction(createValidTransactionData({ amount: 0 }));
        await expect(tx.save()).rejects.toThrow(/Amount must be at least \$0.01/);
      });

      it('should reject amounts with more than 2 decimal places', async () => {
        const tx = new Transaction(createValidTransactionData({ amount: 10.123 }));
        await expect(tx.save()).rejects.toThrow(/Amount must have at most 2 decimal places/);
      });

              it('should reject negative amounts for income transactions', async () => {
            const tx = new Transaction(createValidTransactionData({
                amount: -50.00,
                type: 'income',
                categoryId: user1IncomeCategory._id,
            }));
            // Zod validation runs first and catches the negative amount
            await expect(tx.save()).rejects.toThrow(/Amount must be at least \$0.01/);
        });
    });

    describe('Tags Validation', () => {
        it('should reject tags with invalid characters (only letters and hyphens allowed)', async () => {
            const tx = new Transaction(createValidTransactionData({ tags: ['food', 'work_related', 'test'] }));
            await expect(tx.save()).rejects.toThrow(/Tags can only contain letters and hyphens/);
        });

        it('should reject more than 3 tags', async () => {
            const tx = new Transaction(createValidTransactionData({ tags: ['one', 'two', 'three', 'four'] }));
            // Zod validation runs first and catches too many tags
            await expect(tx.save()).rejects.toThrow(/Cannot have more than 3 tags/);
        });
    });

    describe('Description Validation', () => {
        it('should reject empty descriptions', async () => {
            const tx = new Transaction(createValidTransactionData({ description: '  ' }));
            await expect(tx.save()).rejects.toThrow(/Transaction description is required/);
        });

        it('should reject descriptions longer than 255 characters', async () => {
            const tx = new Transaction(createValidTransactionData({ description: 'a'.repeat(256) }));
            await expect(tx.save()).rejects.toThrow(/Description cannot exceed 255 characters/);
        });
    });
  });

  // =================================================================
  //                    🎯 BUSINESS LOGIC VALIDATION
  // =================================================================

  describe('🎯 Business Logic Validation - Mongoose Middleware Tests', () => {
    
    describe('Relational Integrity', () => {
      it('should reject transactions with a non-existent categoryId', async () => {
        const nonExistentId = testUtils.generateObjectId();
        const tx = new Transaction(createValidTransactionData({ categoryId: nonExistentId }));
        await expect(tx.save()).rejects.toThrow(/Category not found or does not belong to user/);
      });

      it('should reject transactions where categoryId belongs to another user', async () => {
        // Use testUser1 trying to access testUser2's category
        const tx = new Transaction(createValidTransactionData({ 
          userId: testUser1._id,  // testUser1
          categoryId: user2ExpenseCategory._id  // but testUser2's category
        }));
        await expect(tx.save()).rejects.toThrow(/Category not found or does not belong to user/);
      });

      it('should auto-populate transaction type from the category', async () => {
        // Create a transaction and explicitly set the wrong type
        const tx = new Transaction(createValidTransactionData({ 
            categoryId: user1IncomeCategory._id,  // Income category
            type: 'expense' // This should be corrected by the middleware
        }));
        await tx.save();
        expect(tx.type).toBe('income');  // Should be corrected to 'income'
      });
    });

    describe('Automatic Field Calculation', () => {
        it('should correctly calculate and set year, month, and yearMonth on save', async () => {
            const date = new Date('2025-07-15T12:00:00.000Z');
            const tx = new Transaction(createValidTransactionData({ transactionDate: date }));
            await tx.save();
            expect(tx.year).toBe(2025);
            expect(tx.month).toBe(7);
            expect(tx.yearMonth).toBe('2025-07');
        });
    });

    describe('Daily Transaction Limit', () => {
        it('should reject the 101st transaction for a user on the same day', async () => {
            const date = new Date();
            // This is slow, but necessary for an integration test.
            // In a real-world scenario with many such tests, we might mock `countDocuments`.
            const transactions = Array.from({ length: 100 }, (_, i) => ({
                ...createValidTransactionData({transactionDate: date}),
                description: `Tx ${i}`,
                amount: i + 1,
            }));
            // Save each transaction individually to trigger middleware for yearMonth calculation
            for (const txData of transactions) {
                const tx = new Transaction(txData);
                await tx.save();
            }
            
            const lastTx = new Transaction(createValidTransactionData({transactionDate: date}));
            await expect(lastTx.save()).rejects.toThrow(/Daily transaction limit of 100 has been reached/);
    });
    });
    
    describe('Tag Processing', () => {
        it('should process tags correctly when within limits', async () => {
            const tx = new Transaction(createValidTransactionData({
                tags: ['  food  ', 'work', 'food']  // Only 3 unique tags after processing
            }));
            await tx.save();
            // Tag processing middleware should clean these up
            expect(tx.tags).toEqual(['food', 'work']);
        });
    });
  });
  
  // =================================================================
  //                       STATIC & INSTANCE METHODS
  // =================================================================

  describe('🔧 Static & Instance Methods', () => {
    
    // Note: beforeEach cleanup is already handled at the top level

    it('softDelete() should mark transaction as deleted', async () => {
        const tx = new Transaction(createValidTransactionData());
        await tx.save();
        
        await tx.softDelete();
        
        expect(tx.isDeleted).toBe(true);
        expect(tx.deletedAt).toBeInstanceOf(Date);

        const found = await Transaction.findById(tx._id);
        expect(found.isDeleted).toBe(true);
    });

    it('findWithFilters() should exclude soft-deleted transactions by default', async () => {
        const tx1 = new Transaction(createValidTransactionData({ description: 'Active' }));
        await tx1.save();
        const tx2 = new Transaction(createValidTransactionData({ description: 'Deleted' }));
        await tx2.save();
        await tx2.softDelete();
        
        const { transactions, total } = await Transaction.findWithFilters({ userId: testUser1._id });
        expect(total).toBe(1);
        expect(transactions[0].description).toBe('Active');
    });

    it('getMonthlySummary() should calculate correct totals', async () => {
        // Use individual save() calls instead of insertMany() to trigger middleware
        const transactions = [
            new Transaction(createValidTransactionData({ amount: 100.50, type: 'expense', categoryId: user1ExpenseCategory._id, transactionDate: new Date('2025-03-10') })),
            new Transaction(createValidTransactionData({ amount: 25.25, type: 'expense', categoryId: user1ExpenseCategory._id, transactionDate: new Date('2025-03-15') })),
            new Transaction(createValidTransactionData({ amount: 5000, type: 'income', categoryId: user1IncomeCategory._id, transactionDate: new Date('2025-03-01') })),
            new Transaction(createValidTransactionData({ amount: 100, type: 'expense', categoryId: user1ExpenseCategory._id, transactionDate: new Date('2025-04-05') })), // Different month
        ];
        
        // Save each transaction individually to trigger middleware
        for (const tx of transactions) {
            await tx.save();
        }

        const summary = await Transaction.getMonthlySummary(testUser1._id, 2025, 3);
        
        expect(summary.income.total).toBe(5000);
        expect(summary.expenses.total).toBe(125.75);
        expect(summary.netAmount).toBe(5000 - 125.75);
        expect(summary.income.count).toBe(1);
        expect(summary.expenses.count).toBe(2);
    });
  });
});
