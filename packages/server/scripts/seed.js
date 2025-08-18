/* eslint-disable no-console */
require('dotenv').config();
const { faker } = require('@faker-js/faker');
const { User, Category, Transaction } = require('../src/models');
const { connectDB, disconnect } = require('../src/config/db');

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function createUser(index = 1) {
  const email = `seeduser${index}@test.com`;
  const user = new User({
    email,
    password: 'ValidPass123!',
    status: 'active',
    profile: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatarUrl: faker.image.avatar(),
      mobile: faker.phone.number('+1##########')
    },
    settings: {
      theme: 'system',
      currency: 'USD',
      locale: 'en-US',
      notifications: true,
      countryDialCode: '+1'
    }
  });
  await user.save();
  return user;
}

async function createDefaultCategories(userId) {
  const income = await Category.create({ userId, name: 'Salary', type: 'income', color: '#22c55e', icon: 'wallet', isDefault: true });
  const expense = await Category.create({ userId, name: 'Food', type: 'expense', color: '#ef4444', icon: 'utensils', isDefault: true });
  const extras = [
    { name: 'Coffee', type: 'expense', color: '#f97316', icon: 'coffee' },
    { name: 'Rent', type: 'expense', color: '#a855f7', icon: 'home' },
    { name: 'Bonus', type: 'income', color: '#06b6d4', icon: 'gift' },
  ];
  for (const e of extras) {
    await Category.create({ userId, ...e });
  }
  return { income, expense };
}

async function createTransactions(userId, count = 50) {
  const allCats = await Category.find({ userId, isDeleted: false }).lean();
    if (allCats.length === 0) {
    console.log(`No categories found for user ${userId}. Skipping transaction creation.`);
    return;
  }
  for (let i = 0; i < count; i++) {
    const cat = pick(allCats);
    const isIncome = cat.type === 'income';
    const amount = Number(faker.finance.amount({ min: 5, max: 1000, dec: 2 }));
    await Transaction.create({
      userId,
      categoryId: cat._id,
      type: cat.type,
      amount,
      description: isIncome ? 'Salary/Bonus' : faker.commerce.productName(),
      transactionDate: faker.date.recent({ days: 30 }),
      tags: isIncome ? ['salary'] : ['food']
    });
  }
}

async function main() {
  const userId = '689c6d6484a885c2cd23c19e';
  const transactionCount = 500;

  console.log('Connecting to database...');
  await connectDB();
  console.log('Database connected.');

  try {
    console.log(`Seeding ${transactionCount} transactions for user ${userId}...`);
    await createTransactions(userId, transactionCount);
    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('An error occurred during seeding:', error);
  } finally {
    console.log('Disconnecting from database...');
    await disconnect();
    console.log('Database disconnected.');
  }
}

main().catch(async (err) => {
  console.error('Seeding failed:', err);
  try { await disconnect(); } catch {}
  process.exit(1);
});
