/**
 * @fileoverview Category Model - Enterprise-Grade Adversarial Testing Suite
 * @module tests/models/Category
 * @author Murtaza
 * @version 2.0.0
 * @since 1.0.0
 * 
 * Testing Strategy:
 * - Security & Input Validation (Zod schema validation)
 * - Business Logic Validation (Mongoose middleware)
 * - Hierarchical Structure Testing (3-level depth limit)
 * - Soft Delete Functionality
 * - Performance & Concurrency Testing
 * - Integration Testing (Mongoose hooks & middleware)
 * - Adversarial Edge Cases
 * 
 * Test Philosophy: "Break the system before users do"
 * - Assume malicious input
 * - Test boundary conditions
 * - Validate race conditions
 * - Ensure data integrity under stress
 */

const mongoose = require('mongoose');
const Category = require('../../src/models/Category.model');

const { testUtils } = global;

describe('Category Model - Murtaza\'s Adversarial Testing Suite', () => {
  
  // =================================================================
  //                    🔒 SECURITY & INPUT VALIDATION
  // =================================================================
  
  describe('🔒 Security & Input Validation - Zod Schema Tests', () => {
    
    describe('Category Name Validation', () => {
      it('should reject empty category names', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: '',
          type: 'income',
        });
        await expect(cat.save()).rejects.toThrow(/Category name is required/);
      });

      it('should reject whitespace-only category names', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: '   ',
          type: 'income',
        });
        await expect(cat.save()).rejects.toThrow(/Category name is required/);
      });

      it('should reject category names exceeding 50 characters', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'a'.repeat(51), // 51 characters
          type: 'income',
        });
        await expect(cat.save()).rejects.toThrow(/Category name cannot exceed 50 characters/);
      });

      it('should accept valid category names and trim whitespace', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: '  Valid Category Name  ',
          type: 'income',
        });
        const saved = await cat.save();
        expect(saved.name).toBe('Valid Category Name');
      });

      it('should reject null category names', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: null,
          type: 'income',
        });
        await expect(cat.save()).rejects.toThrow(/Invalid input: expected string, received null/);
      });

      it('should reject undefined category names', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          type: 'income',
        });
        await expect(cat.save()).rejects.toThrow(/Invalid input: expected string, received undefined/);
      });
    });

    describe('Category Type Validation', () => {
      it('should accept valid income type', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Test Income',
          type: 'income',
        });
        const saved = await cat.save();
        expect(saved.type).toBe('income');
      });

      it('should accept valid expense type', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Test Expense',
          type: 'expense',
        });
        const saved = await cat.save();
        expect(saved.type).toBe('expense');
      });

      it('should reject invalid category types', async () => {
        const invalidTypes = ['invalid', 'INCOME', 'Expense', 'transfer', '', null, undefined, 123];
        
        for (const type of invalidTypes) {
          const cat = new Category({
            userId: testUtils.generateObjectId(),
            name: 'Test',
            type,
          });
          await expect(cat.save()).rejects.toThrow(/Invalid option: expected one of|Invalid input/);
        }
      });
    });

    describe('Color Validation', () => {
      it('should accept valid hex colors', async () => {
        const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#123ABC'];
        
        for (const color of validColors) {
          const cat = new Category({
            userId: testUtils.generateObjectId(),
            name: `Test ${color}`,
            type: 'income',
            color,
          });
          const saved = await cat.save();
          expect(saved.color).toBe(color);
        }
      });

      it('should reject invalid hex colors', async () => {
        const invalidColors = ['red', '#GG0000', '#FF00', '#FF00000', 'not-a-color', '123456', null];
        
        for (const color of invalidColors) {
          const cat = new Category({
            userId: testUtils.generateObjectId(),
            name: 'Test',
            type: 'income',
            color,
          });
          await expect(cat.save()).rejects.toThrow(/Color must be valid hex format|Invalid input/);
        }
      });

      it('should use default color when not provided', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Test',
          type: 'income',
        });
        const saved = await cat.save();
        expect(saved.color).toBe('#CCCCCC');
      });
    });

    describe('Icon Validation', () => {
      it('should accept valid icon names', async () => {
        const validIcons = ['tag', 'briefcase', 'laptop', 'trending-up', 'plus-circle', 'utensils', 'car'];
        
        for (const icon of validIcons) {
          const cat = new Category({
            userId: testUtils.generateObjectId(),
            name: `Test ${icon}`,
            type: 'income',
            icon,
          });
          const saved = await cat.save();
          expect(saved.icon).toBe(icon);
        }
      });

      it('should reject invalid icon formats', async () => {
        const invalidIcons = ['INVALID', 'invalid_icon', 'invalid icon', '123', '', null];
        
        for (const icon of invalidIcons) {
          const cat = new Category({
            userId: testUtils.generateObjectId(),
            name: 'Test',
            type: 'income',
            icon,
          });
          await expect(cat.save()).rejects.toThrow(/Icon must be lowercase letters and hyphens only|Icon is required|Invalid input/);
        }
      });

      it('should reject icons exceeding 30 characters', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Test',
          type: 'income',
          icon: 'a'.repeat(31), // 31 characters
        });
        await expect(cat.save()).rejects.toThrow(/Icon name cannot exceed 30 characters/);
      });

      it('should use default icon when not provided', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Test',
          type: 'income',
        });
        const saved = await cat.save();
        expect(saved.icon).toBe('tag');
      });
    });

    describe('Monthly Budget Validation', () => {
      it('should accept valid positive budget amounts', async () => {
        const validBudgets = [0, 100.50, 999999999.99, 0.01];
        
        for (const budget of validBudgets) {
          const cat = new Category({
            userId: testUtils.generateObjectId(),
            name: `Test ${budget}`,
            type: 'expense',
            monthlyBudget: budget,
          });
          const saved = await cat.save();
          expect(saved.getMonthlyBudgetAmount()).toBe(budget);
        }
      });

      it('should reject negative budget amounts', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Test',
          type: 'expense',
          monthlyBudget: -10,
        });
        await expect(cat.save()).rejects.toThrow(/Monthly budget cannot be negative/);
      });

      it('should reject excessive budget amounts', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Test',
          type: 'expense',
          monthlyBudget: 1000000000, // Exceeds max
        });
        await expect(cat.save()).rejects.toThrow(/Monthly budget cannot exceed/);
      });

      it('should reject budgets with more than 2 decimal places', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Test',
          type: 'expense',
          monthlyBudget: 100.123, // 3 decimal places
        });
        await expect(cat.save()).rejects.toThrow(/Budget must have at most 2 decimal places/);
      });

      it('should use default budget when not provided', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Test',
          type: 'expense',
        });
        const saved = await cat.save();
        expect(saved.getMonthlyBudgetAmount()).toBe(0);
      });
    });

    describe('Required Fields Validation', () => {
      it('should reject categories missing userId', async () => {
        const cat = new Category({
          name: 'Test',
          type: 'income',
        });
        await expect(cat.save()).rejects.toThrow(/Invalid input/);
      });

      it('should reject categories with invalid userId', async () => {
        const cat = new Category({
          userId: 'invalid-object-id',
          name: 'Test',
          type: 'income',
        });
        await expect(cat.save()).rejects.toThrow(/Cast to ObjectId failed/);
      });

      it('should accept minimal valid category', async () => {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name: 'Minimal',
          type: 'income',
        });
        const saved = await cat.save();
        expect(saved.name).toBe('Minimal');
        expect(saved.type).toBe('income');
        expect(saved.color).toBe('#CCCCCC');
        expect(saved.icon).toBe('tag');
        expect(saved.isDefault).toBe(false);
        expect(saved.getMonthlyBudgetAmount()).toBe(0);
      });
    });
  });

  // =================================================================
  //                    🎯 BUSINESS LOGIC VALIDATION
  // =================================================================
  
  describe('🎯 Business Logic Validation - Mongoose Middleware Tests', () => {
    
    describe('Category Name Uniqueness', () => {
      it('should enforce unique category names per user and type', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create first category
        await Category.create({ 
          userId, 
          name: 'Unique Category', 
          type: 'income' 
        });
        
        // Try to create duplicate
        const duplicate = new Category({ 
          userId, 
          name: 'Unique Category', 
          type: 'income' 
        });
        
        await expect(duplicate.save()).rejects.toThrow(/already exists/);
      });

      it('should allow same name for different types', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create income category
        await Category.create({ 
          userId, 
          name: 'Same Name', 
          type: 'income' 
        });
        
        // Create expense category with same name - should succeed
        const expenseCategory = new Category({ 
          userId, 
          name: 'Same Name', 
          type: 'expense' 
        });
        
        const saved = await expenseCategory.save();
        expect(saved.name).toBe('Same Name');
        expect(saved.type).toBe('expense');
      });

      it('should allow same name for different users', async () => {
        const userId1 = testUtils.generateObjectId();
        const userId2 = testUtils.generateObjectId();
        
        // Create category for user 1
        await Category.create({ 
          userId: userId1, 
          name: 'Common Name', 
          type: 'income' 
        });
        
        // Create category with same name for user 2 - should succeed
        const category2 = new Category({ 
          userId: userId2, 
          name: 'Common Name', 
          type: 'income' 
        });
        
        const saved = await category2.save();
        expect(saved.name).toBe('Common Name');
        expect(saved.userId.toString()).toBe(userId2.toString());
      });

      it('should ignore deleted categories in uniqueness check', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create and soft delete category
        const category1 = await Category.create({ 
          userId, 
          name: 'Deleted Category', 
          type: 'income' 
        });
        await category1.softDelete();
        
        // Create new category with same name - should succeed
        const category2 = new Category({ 
          userId, 
          name: 'Deleted Category', 
          type: 'income' 
        });
        
        const saved = await category2.save();
        expect(saved.name).toBe('Deleted Category');
        expect(saved.isDeleted).toBe(false);
      });
    });

    describe('Default Category Logic', () => {
      it('should allow only one default per user per type', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create first default category
        const cat1 = await Category.create({ 
          userId, 
          name: 'First Default', 
          type: 'income', 
          isDefault: true 
        });
        expect(cat1.isDefault).toBe(true);
        
        // Create second default category - should unset first
        const cat2 = await Category.create({ 
          userId, 
          name: 'Second Default', 
          type: 'income', 
          isDefault: true 
        });
        expect(cat2.isDefault).toBe(true);
        
        // Check that first is no longer default
        const updatedCat1 = await Category.findById(cat1._id);
        expect(updatedCat1.isDefault).toBe(false);
        
        // Verify only one default exists
        const defaults = await Category.find({ userId, type: 'income', isDefault: true });
        expect(defaults).toHaveLength(1);
        expect(defaults[0].name).toBe('Second Default');
      });

      it('should allow different default categories for different types', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create default income category
        const incomeDefault = await Category.create({ 
          userId, 
          name: 'Income Default', 
          type: 'income', 
          isDefault: true 
        });
        
        // Create default expense category
        const expenseDefault = await Category.create({ 
          userId, 
          name: 'Expense Default', 
          type: 'expense', 
          isDefault: true 
        });
        
        expect(incomeDefault.isDefault).toBe(true);
        expect(expenseDefault.isDefault).toBe(true);
        
        // Verify both are still default
        const incomeDefaults = await Category.find({ userId, type: 'income', isDefault: true });
        const expenseDefaults = await Category.find({ userId, type: 'expense', isDefault: true });
        
        expect(incomeDefaults).toHaveLength(1);
        expect(expenseDefaults).toHaveLength(1);
      });

      it('should handle concurrent default category updates atomically', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create multiple categories
        const cats = await Category.insertMany([
          { userId, name: 'Cat A', type: 'income' },
          { userId, name: 'Cat B', type: 'income' },
          { userId, name: 'Cat C', type: 'income' },
        ]);
        
        // Try to set all as default concurrently
        const promises = cats.map(cat => {
          cat.isDefault = true;
          return cat.save();
        });
        
        await Promise.allSettled(promises);
        
        // Verify only one is default
        const defaults = await Category.find({ userId, type: 'income', isDefault: true });
        expect(defaults).toHaveLength(1);
      });
    });

    describe('Update Restrictions', () => {
      it('should prevent changing category type after creation', async () => {
        const category = await Category.create({
          userId: testUtils.generateObjectId(),
          name: 'Test Category',
          type: 'income',
        });
        
        category.type = 'expense';
        await expect(category.save()).rejects.toThrow(/Cannot change category type/);
      });

      it('should prevent changing userId after creation', async () => {
        const category = await Category.create({
          userId: testUtils.generateObjectId(),
          name: 'Test Category',
          type: 'income',
        });
        
        category.userId = testUtils.generateObjectId();
        await expect(category.save()).rejects.toThrow(/Cannot change category owner/);
      });

      it('should prevent changing parentId after creation', async () => {
        const userId = testUtils.generateObjectId();
        const parent = await Category.create({
          userId,
          name: 'Parent',
          type: 'income',
        });
        
        const category = await Category.create({
          userId,
          name: 'Child',
          type: 'income',
        });
        
        category.parentId = parent._id;
        await expect(category.save()).rejects.toThrow(/Cannot change parent of existing category/);
      });

      it('should allow updating name, color, icon, and budget', async () => {
        const category = await Category.create({
          userId: testUtils.generateObjectId(),
          name: 'Original Name',
          type: 'income',
          color: '#FF0000',
          icon: 'tag',
          monthlyBudget: 100,
        });
        
        category.name = 'Updated Name';
        category.color = '#00FF00';
        category.icon = 'briefcase';
        category.monthlyBudget = 200;
        
        const updated = await category.save();
        expect(updated.name).toBe('Updated Name');
        expect(updated.color).toBe('#00FF00');
        expect(updated.icon).toBe('briefcase');
        expect(updated.getMonthlyBudgetAmount()).toBe(200);
      });
    });
  });

  // =================================================================
  //                    🌳 HIERARCHICAL STRUCTURE TESTS
  // =================================================================
  
  describe('🌳 Hierarchical Structure - Parent-Child Relationships', () => {
    
    describe('Parent-Child Validation', () => {
      it('should create valid parent-child relationship', async () => {
        const userId = testUtils.generateObjectId();
        
        const parent = await Category.create({
          userId,
          name: 'Parent Category',
          type: 'expense',
        });
        
        const child = await Category.create({
          userId,
          name: 'Child Category',
          type: 'expense',
          parentId: parent._id,
        });
        
        expect(child.parentId.toString()).toBe(parent._id.toString());
      });

      it('should reject parent from different user', async () => {
        const userId1 = testUtils.generateObjectId();
        const userId2 = testUtils.generateObjectId();
        
        const parent = await Category.create({
          userId: userId1,
          name: 'Parent',
          type: 'expense',
        });
        
        const child = new Category({
          userId: userId2,
          name: 'Child',
          type: 'expense',
          parentId: parent._id,
        });
        
        await expect(child.save()).rejects.toThrow(/Parent category must belong to the same user/);
      });

      it('should reject parent of different type', async () => {
        const userId = testUtils.generateObjectId();
        
        const parent = await Category.create({
          userId,
          name: 'Income Parent',
          type: 'income',
        });
        
        const child = new Category({
          userId,
          name: 'Expense Child',
          type: 'expense',
          parentId: parent._id,
        });
        
        await expect(child.save()).rejects.toThrow(/Parent category must be of the same type/);
      });

      it('should reject non-existent parent', async () => {
        const userId = testUtils.generateObjectId();
        const nonExistentId = testUtils.generateObjectId();
        
        const child = new Category({
          userId,
          name: 'Orphan Child',
          type: 'expense',
          parentId: nonExistentId,
        });
        
        await expect(child.save()).rejects.toThrow(/Parent category not found/);
      });
    });

    describe('Hierarchy Depth Limits', () => {
      it('should allow 3-level hierarchy (Root → Child → Grandchild)', async () => {
        const userId = testUtils.generateObjectId();
        
        // Level 1: Root
        const root = await Category.create({
          userId,
          name: 'Root',
          type: 'expense',
        });
        
        // Level 2: Child
        const child = await Category.create({
          userId,
          name: 'Child',
          type: 'expense',
          parentId: root._id,
        });
        
        // Level 3: Grandchild
        const grandchild = await Category.create({
          userId,
          name: 'Grandchild',
          type: 'expense',
          parentId: child._id,
        });
        
        expect(grandchild.parentId.toString()).toBe(child._id.toString());
      });

      it('should reject 4th level hierarchy', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create 3-level hierarchy
        const root = await Category.create({
          userId,
          name: 'Root',
          type: 'expense',
        });
        
        const child = await Category.create({
          userId,
          name: 'Child',
          type: 'expense',
          parentId: root._id,
        });
        
        const grandchild = await Category.create({
          userId,
          name: 'Grandchild',
          type: 'expense',
          parentId: child._id,
        });
        
        // Try to create 4th level - should fail
        const greatGrandchild = new Category({
          userId,
          name: 'Great Grandchild',
          type: 'expense',
          parentId: grandchild._id,
        });
        
        await expect(greatGrandchild.save()).rejects.toThrow(/Maximum 3 levels allowed/);
      });
    });

    describe('Circular Reference Prevention', () => {
      it('should prevent self-referencing categories', async () => {
        const userId = testUtils.generateObjectId();
        
        const category = await Category.create({
          userId,
          name: 'Self Reference',
          type: 'expense',
        });
        
        // Try to make it its own parent
        category.parentId = category._id;
        await expect(category.save()).rejects.toThrow(/Cannot change parent of existing category/);
      });

      it('should prevent circular parent-child relationships during creation', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create parent
        const parent = await Category.create({
          userId,
          name: 'Parent',
          type: 'expense',
        });
        
        // Create child
        const child = await Category.create({
          userId,
          name: 'Child',
          type: 'expense',
          parentId: parent._id,
        });
        
        // Try to make parent a child of child - should fail due to update restriction
        parent.parentId = child._id;
        await expect(parent.save()).rejects.toThrow(/Cannot change parent of existing category/);
      });
    });

    describe('Hierarchy Methods', () => {
      it('should build correct hierarchy path', async () => {
        const userId = testUtils.generateObjectId();
        
        const root = await Category.create({
          userId,
          name: 'Root Category',
          type: 'expense',
        });
        
        const child = await Category.create({
          userId,
          name: 'Child Category',
          type: 'expense',
          parentId: root._id,
        });
        
        const grandchild = await Category.create({
          userId,
          name: 'Grandchild Category',
          type: 'expense',
          parentId: child._id,
        });
        
        const path = await grandchild.getHierarchyPath();
        expect(path).toBe('Root Category > Child Category > Grandchild Category');
      });

      it('should return correct children', async () => {
        const userId = testUtils.generateObjectId();
        
        const parent = await Category.create({
          userId,
          name: 'Parent',
          type: 'expense',
        });
        
        await Category.create({
          userId,
          name: 'Child 1',
          type: 'expense',
          parentId: parent._id,
        });
        
        await Category.create({
          userId,
          name: 'Child 2',
          type: 'expense',
          parentId: parent._id,
        });
        
        const children = await parent.getChildren();
        expect(children).toHaveLength(2);
        expect(children.map(c => c.name).sort()).toEqual(['Child 1', 'Child 2']);
      });

      it('should exclude deleted children', async () => {
        const userId = testUtils.generateObjectId();
        
        const parent = await Category.create({
          userId,
          name: 'Parent',
          type: 'expense',
        });
        
        const child1 = await Category.create({
          userId,
          name: 'Active Child',
          type: 'expense',
          parentId: parent._id,
        });
        
        const child2 = await Category.create({
          userId,
          name: 'Deleted Child',
          type: 'expense',
          parentId: parent._id,
        });
        
        await child2.softDelete();
        
        const children = await parent.getChildren();
        expect(children).toHaveLength(1);
        expect(children[0].name).toBe('Active Child');
      });
    });
  });

  // =================================================================
  //                    💀 SOFT DELETE FUNCTIONALITY
  // =================================================================
  
  describe('💀 Soft Delete Functionality', () => {
    
    it('should soft delete category and set timestamps', async () => {
      const category = await Category.create({
        userId: testUtils.generateObjectId(),
        name: 'To Delete',
        type: 'expense',
      });
      
      expect(category.isDeleted).toBe(false);
      expect(category.deletedAt).toBeNull();
      
      await category.softDelete();
      
      expect(category.isDeleted).toBe(true);
      expect(category.deletedAt).toBeInstanceOf(Date);
    });

    it('should soft delete category and all children recursively', async () => {
      const userId = testUtils.generateObjectId();
      
      // Create hierarchy
      const root = await Category.create({
        userId,
        name: 'Root',
        type: 'expense',
      });
      
      const child = await Category.create({
        userId,
        name: 'Child',
        type: 'expense',
        parentId: root._id,
      });
      
      const grandchild = await Category.create({
        userId,
        name: 'Grandchild',
        type: 'expense',
        parentId: child._id,
      });
      
      // Soft delete root
      await root.softDelete();
      
      // Check all are deleted
      const freshRoot = await Category.findById(root._id);
      const freshChild = await Category.findById(child._id);
      const freshGrandchild = await Category.findById(grandchild._id);
      
      expect(freshRoot.isDeleted).toBe(true);
      expect(freshChild.isDeleted).toBe(true);
      expect(freshGrandchild.isDeleted).toBe(true);
      
      expect(freshRoot.deletedAt).toBeInstanceOf(Date);
      expect(freshChild.deletedAt).toBeInstanceOf(Date);
      expect(freshGrandchild.deletedAt).toBeInstanceOf(Date);
    });

    it('should handle soft delete timestamps correctly', async () => {
      const category = await Category.create({
        userId: testUtils.generateObjectId(),
        name: 'Test Timestamps',
        type: 'expense',
      });
      
      // Manually mark as deleted
      category.isDeleted = true;
      await category.save();
      
      expect(category.isDeleted).toBe(true);
      expect(category.deletedAt).toBeInstanceOf(Date);
      
      // Undelete
      category.isDeleted = false;
      await category.save();
      
      expect(category.isDeleted).toBe(false);
      expect(category.deletedAt).toBeNull();
    });
  });

  // =================================================================
  //                    🚀 PERFORMANCE & CONCURRENCY
  // =================================================================
  
  describe('🚀 Performance & Concurrency Testing', () => {
    
    it('should handle concurrent category creation efficiently', async () => {
      const userId = testUtils.generateObjectId();
      
      const startTime = Date.now();
      
      // Create 50 categories concurrently
      const promises = Array.from({ length: 50 }, (_, i) => 
        Category.create({
          userId,
          name: `Concurrent Category ${i}`,
          type: i % 2 === 0 ? 'income' : 'expense',
        })
      );
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      // All should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful).toHaveLength(50);
      
      // Should complete in reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // Verify all were created
      const count = await Category.countDocuments({ userId });
      expect(count).toBe(50);
    });

    it('should handle concurrent default category updates with race conditions', async () => {
      const userId = testUtils.generateObjectId();
      
      // Create 10 categories
      const categories = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          Category.create({
            userId,
            name: `Race Category ${i}`,
            type: 'income',
          })
        )
      );
      
      // Try to set all as default simultaneously
      const promises = categories.map(cat => {
        cat.isDefault = true;
        return cat.save();
      });
      
      await Promise.allSettled(promises);
      
      // Verify only one is default
      const defaults = await Category.find({ userId, type: 'income', isDefault: true });
      expect(defaults).toHaveLength(1);
    });

    it('should efficiently query categories with proper indexing', async () => {
      const userId = testUtils.generateObjectId();
      
      // Create many categories
      const categories = Array.from({ length: 1000 }, (_, i) => ({
        userId,
        name: `Category ${i}`,
        type: i % 2 === 0 ? 'income' : 'expense',
      }));
      
      await Category.insertMany(categories);
      
      const startTime = Date.now();
      
      // Query should be fast due to compound index
      const incomeCategories = await Category.findByUserAndType(userId, 'income');
      
      const endTime = Date.now();
      
      expect(incomeCategories).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });

  // =================================================================
  //                    🔧 INTEGRATION TESTS
  // =================================================================
  
  describe('🔧 Integration Tests - Static Methods & Utilities', () => {
    
    describe('Category Hierarchy Methods', () => {
      it('should build complete category hierarchy', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create complex hierarchy
        const food = await Category.create({
          userId,
          name: 'Food & Dining',
          type: 'expense',
        });
        
        const restaurants = await Category.create({
          userId,
          name: 'Restaurants',
          type: 'expense',
          parentId: food._id,
        });
        
        const fastFood = await Category.create({
          userId,
          name: 'Fast Food',
          type: 'expense',
          parentId: restaurants._id,
        });
        
        await Category.create({
          userId,
          name: 'Fine Dining',
          type: 'expense',
          parentId: restaurants._id,
        });
        
        await Category.create({
          userId,
          name: 'Groceries',
          type: 'expense',
          parentId: food._id,
        });
        
        const hierarchy = await Category.getCategoryHierarchy(userId, 'expense');
        
        expect(hierarchy).toHaveLength(1); // One root category
        expect(hierarchy[0].name).toBe('Food & Dining');
        expect(hierarchy[0].children).toHaveLength(2); // Restaurants and Groceries
        
        const restaurantCategory = hierarchy[0].children.find(c => c.name === 'Restaurants');
        expect(restaurantCategory.children).toHaveLength(2); // Fast Food and Fine Dining
      });
    });

    describe('Default Category Management', () => {
      it('should create default categories for new user', async () => {
        const userId = testUtils.generateObjectId();
        
        const defaults = await Category.createDefaultCategories(userId);
        
        expect(defaults).toHaveLength(12); // 4 income + 8 expense
        
        // Check income defaults
        const incomeDefaults = defaults.filter(c => c.type === 'income');
        expect(incomeDefaults).toHaveLength(4);
        expect(incomeDefaults.filter(c => c.isDefault)).toHaveLength(1);
        expect(incomeDefaults.find(c => c.isDefault).name).toBe('Salary');
        
        // Check expense defaults
        const expenseDefaults = defaults.filter(c => c.type === 'expense');
        expect(expenseDefaults).toHaveLength(8);
        expect(expenseDefaults.filter(c => c.isDefault)).toHaveLength(1);
        expect(expenseDefaults.find(c => c.isDefault).name).toBe('Food & Dining');
      });

      it('should atomically set default category (skip for in-memory MongoDB)', async () => {
        const userId = testUtils.generateObjectId();
        
        // Create categories
        const cat1 = await Category.create({
          userId,
          name: 'Category 1',
          type: 'income',
          isDefault: true,
        });
        
        const cat2 = await Category.create({
          userId,
          name: 'Category 2',
          type: 'income',
        });
        
        // Note: MongoDB Memory Server doesn't support transactions
        // Test the fallback behavior by manually setting default
        cat2.isDefault = true;
        await cat2.save();
        
        // Verify cat2 is now default
        const result = await Category.findById(cat2._id);
        expect(result.isDefault).toBe(true);
        
        // Verify cat1 is no longer default (due to middleware)
        const updatedCat1 = await Category.findById(cat1._id);
        expect(updatedCat1.isDefault).toBe(false);
        
        // Verify only one default exists
        const defaultCategory = await Category.getDefaultCategory(userId, 'income');
        expect(defaultCategory._id.toString()).toBe(cat2._id.toString());
      });
    });

    describe('JSON Serialization', () => {
      it('should store monthlyBudget as Decimal128 and provide number conversion method', async () => {
        const category = await Category.create({
          userId: testUtils.generateObjectId(),
          name: 'Budget Test',
          type: 'expense',
          monthlyBudget: 150.75,
        });
        
        // Storage should be Decimal128 for precision
        expect(category.monthlyBudget.constructor.name).toBe('Decimal128');
        
        // Method should convert to number when needed
        expect(category.getMonthlyBudgetAmount()).toBe(150.75);
        
        // JSON serialization keeps Decimal128 structure (frontend calls method when needed)
        const json = category.toJSON();
        // Note: __v might be 0 instead of undefined for new documents
        expect(json.__v).toBeFalsy();
      });

      it('should handle Decimal128 precision and provide clean number access', async () => {
        const category = await Category.create({
          userId: testUtils.generateObjectId(),
          name: 'Precision Test',
          type: 'income',
          monthlyBudget: 999.99, // Test precision (2 decimal places as per schema)
        });
        
        // Storage maintains precision with Decimal128
        expect(category.monthlyBudget.constructor.name).toBe('Decimal128');
        
        // Method provides clean number conversion when needed
        expect(category.getMonthlyBudgetAmount()).toBe(999.99);
        
        // Object serialization keeps raw structure
        const obj = category.toObject();
        expect(obj.__v).toBeFalsy(); // May be 0 instead of undefined
        
        // Frontend can call method when it needs number value
        expect(category.getMonthlyBudgetAmount()).toBe(999.99);
      });
    });
  });

  // =================================================================
  //                    🧨 ADVERSARIAL EDGE CASES
  // =================================================================
  
  describe('🧨 Adversarial Edge Cases - Breaking the System', () => {
    
    it('should handle malformed ObjectIds gracefully', async () => {
      const malformedIds = [
        { id: '', expectedError: /Cast to ObjectId failed/ },
        { id: 'invalid', expectedError: /Cast to ObjectId failed/ },
        { id: '123', expectedError: /Cast to ObjectId failed/ },
        { id: null, expectedError: /Invalid input/ },
        { id: undefined, expectedError: /Invalid input/ },
      ];
      
      for (const { id, expectedError } of malformedIds) {
        const cat = new Category({
          userId: id,
          name: 'Test',
          type: 'income',
        });
        await expect(cat.save()).rejects.toThrow(expectedError);
      }
    });

    it('should handle extreme Unicode characters in names', async () => {
      const unicodeNames = [
        '🚀💰📊', // Emojis
        'Категория', // Cyrillic
        '类别', // Chinese
        'カテゴリー', // Japanese
        'فئة', // Arabic
      ];
      
      for (const name of unicodeNames) {
        const cat = new Category({
          userId: testUtils.generateObjectId(),
          name,
          type: 'income',
        });
        const saved = await cat.save();
        expect(saved.name).toBe(name);
      }
    });

    it('should handle memory pressure during bulk operations', async () => {
      const userId = testUtils.generateObjectId();
      const batchSize = 100;
      
      // Create categories in batches to avoid memory issues
      for (let i = 0; i < 5; i++) {
        const batch = Array.from({ length: batchSize }, (_, j) => ({
          userId,
          name: `Batch ${i} Category ${j}`,
          type: j % 2 === 0 ? 'income' : 'expense',
        }));
        
        await Category.insertMany(batch);
      }
      
      const count = await Category.countDocuments({ userId });
      expect(count).toBe(500);
    });

    it('should maintain data integrity during concurrent operations', async () => {
      const userId = testUtils.generateObjectId();
      
      // Simulate concurrent create, update, delete operations
      const operations = [
        // Creates
        ...Array.from({ length: 10 }, (_, i) => 
          () => Category.create({
            userId,
            name: `Concurrent Create ${i}`,
            type: 'income',
          })
        ),
        // Updates
        ...Array.from({ length: 5 }, (_, i) => 
          async () => {
            const cat = await Category.create({
              userId,
              name: `To Update ${i}`,
              type: 'expense',
            });
            cat.name = `Updated ${i}`;
            return cat.save();
          }
        ),
        // Soft deletes
        ...Array.from({ length: 3 }, (_, i) => 
          async () => {
            const cat = await Category.create({
              userId,
              name: `To Delete ${i}`,
              type: 'income',
            });
            return cat.softDelete();
          }
        ),
      ];
      
      // Execute all operations concurrently
      const results = await Promise.allSettled(
        operations.map(op => op())
      );
      
      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(15);
      
      // Verify database consistency
      const totalCategories = await Category.countDocuments({ userId });
      const activeCategories = await Category.countDocuments({ userId, isDeleted: false });
      const deletedCategories = await Category.countDocuments({ userId, isDeleted: true });
      
      expect(totalCategories).toBe(activeCategories + deletedCategories);
    });

    it('should handle database connection issues gracefully', async () => {
      // This test simulates what happens when database operations fail
      const originalFind = Category.findOne;
      
      // Mock a database error
      Category.findOne = jest.fn().mockRejectedValue(new Error('Database connection lost'));
      
      const cat = new Category({
        userId: testUtils.generateObjectId(),
        name: 'Test Connection',
        type: 'income',
      });
      
      // Should handle the database error during validation
      await expect(cat.save()).rejects.toThrow(/Database connection lost/);
      
      // Restore original method
      Category.findOne = originalFind;
    });
  });
});