const request = require("supertest");
const app = require("../../src/app");
const { User, Category, Transaction } = require("../../src/models");

async function registerAndLogin(overrides = {}) {
	const user = {
		email: "txnuser@test.com",
		password: "ValidPass123!",
		profile: { firstName: "Tx", lastName: "User" },
		...overrides,
	};
	await request(app).post("/api/v1/auth/register").send(user).expect(201);
	await User.updateOne({ email: user.email }, { $set: { status: "active" } });
	const res = await request(app)
		.post("/api/v1/auth/login")
		.send({ email: user.email, password: user.password })
		.expect(200);
	const token = res.body.data.token;
	const dbUser = await User.findOne({ email: user.email });
	return { token, userId: dbUser._id };
}

describe("Transactions API - Murtaza's Adversarial Testing Suite", () => {
	beforeEach(async () => {
		await Transaction.deleteMany({});
		await Category.deleteMany({});
		await User.deleteMany({});
	});

	describe("🔒 CRUD + Queries", () => {
		it("should create, list, get, update, delete, and clone transactions", async () => {
			const { token, userId } = await registerAndLogin();

			// Fetch default categories for user
			const incomeCategory = await Category.findOne({
				userId,
				type: "income",
				isDefault: true,
				isDeleted: false,
			});
			const expenseCategory = await Category.findOne({
				userId,
				type: "expense",
				isDefault: true,
				isDeleted: false,
			});
			expect(incomeCategory).toBeDefined();
			expect(expenseCategory).toBeDefined();

			// Create income transaction
			const createIncomeRes = await request(app)
				.post("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.send({
					categoryId: incomeCategory._id.toString(),
					type: "income",
					amount: 1500.75,
					description: "Salary August",
					transactionDate: new Date().toISOString(),
					tags: ["salary"],
				})
				.expect(201);

			expect(createIncomeRes.body.success).toBe(true);
			const incomeTxnId = createIncomeRes.body.data._id;

			// Create expense transaction
			const createExpenseRes = await request(app)
				.post("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.send({
					categoryId: expenseCategory._id.toString(),
					type: "expense",
					amount: 200.5,
					description: "Food & Dining",
					transactionDate: new Date().toISOString(),
					tags: ["food"],
				})
				.expect(201);

			expect(createExpenseRes.body.success).toBe(true);
			const expenseTxnId = createExpenseRes.body.data._id;

			// List transactions - filter by type
			const listIncome = await request(app)
				.get("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.query({ type: "income", page: "1", limit: "10" })
				.expect(200);
			expect(listIncome.body.success).toBe(true);
			expect(listIncome.body.data.transactions.length).toBeGreaterThanOrEqual(
				1
			);

			// Get single transaction
			const getIncome = await request(app)
				.get(`/api/v1/transactions/${incomeTxnId}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(200);
			expect(getIncome.body.data._id).toBe(incomeTxnId);

			// Update transaction (amount + description)
			const updateRes = await request(app)
				.patch(`/api/v1/transactions/${expenseTxnId}`)
				.set("Authorization", `Bearer ${token}`)
				.send({ amount: 250.75, description: "Dinner" })
				.expect(200);
			expect(updateRes.body.success).toBe(true);
			expect(updateRes.body.data.description).toBe("Dinner");

			// Summary current month
			const now = new Date();
			const summary = await request(app)
				.get("/api/v1/transactions/summary")
				.set("Authorization", `Bearer ${token}`)
				.query({
					year: String(now.getFullYear()),
					month: String(now.getMonth() + 1),
				})
				.expect(200);
			expect(summary.body.success).toBe(true);
			expect(summary.body.data).toHaveProperty("income");
			expect(summary.body.data).toHaveProperty("expenses");

			// Category breakdown (no filter)
			const breakdown = await request(app)
				.get("/api/v1/transactions/category-breakdown")
				.set("Authorization", `Bearer ${token}`)
				.expect(200);
			expect(breakdown.body.success).toBe(true);
			expect(Array.isArray(breakdown.body.data)).toBe(true);

			// Clone transaction
			const cloneRes = await request(app)
				.post(`/api/v1/transactions/${incomeTxnId}/clone`)
				.set("Authorization", `Bearer ${token}`)
				.send({ description: "Cloned Salary" })
				.expect(201);
			expect(cloneRes.body.success).toBe(true);
			expect(cloneRes.body.data._id).not.toBe(incomeTxnId);

			// Delete transaction (soft delete)
			const deleteRes = await request(app)
				.delete(`/api/v1/transactions/${expenseTxnId}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(200);
			expect(deleteRes.body.success).toBe(true);

			// Verify deleted not accessible
			await request(app)
				.get(`/api/v1/transactions/${expenseTxnId}`)
				.set("Authorization", `Bearer ${token}`)
				.expect(404);
		});
	});

	describe("💀 Validation & Edge Cases", () => {
		it("should reject invalid payloads and params", async () => {
			const { token, userId } = await registerAndLogin();
			const expenseCategory = await Category.findOne({
				userId,
				type: "expense",
				isDefault: true,
				isDeleted: false,
			});

			// Missing required fields
			await request(app)
				.post("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.send({})
				.expect(400);

			// Invalid ObjectId param
			await request(app)
				.get("/api/v1/transactions/not-an-id")
				.set("Authorization", `Bearer ${token}`)
				.expect(400);

			// Invalid query types
			await request(app)
				.get("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.query({ page: "0" })
				.expect(400);

			// Negative amount should be rejected by business rule
			await request(app)
				.post("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.send({
					categoryId: expenseCategory._id.toString(),
					type: "expense",
					amount: -10,
					description: "Invalid",
					transactionDate: new Date().toISOString(),
				})
				.expect(400);

			// Invalid date
			await request(app)
				.post("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.send({
					categoryId: expenseCategory._id.toString(),
					type: "expense",
					amount: 10,
					description: "Bad date",
					transactionDate: "not-a-date",
				})
				.expect(400);
		});
	});

	describe("📊 Listing, filtering, pagination & sorting", () => {
		it("should support categoryId/minAmount/maxAmount filters and pagination metadata", async () => {
			const { token, userId } = await registerAndLogin();

			const expenseCategory = await Category.findOne({ userId, type: "expense", isDefault: true, isDeleted: false });
			const incomeCategory = await Category.findOne({ userId, type: "income", isDefault: true, isDeleted: false });

			// Create 5 expense and 3 income transactions with varying amounts
			const nowIso = new Date().toISOString();
			const payloads = [
				{ categoryId: expenseCategory._id.toString(), type: "expense", amount: 10, description: "E1", transactionDate: nowIso, tags: ["food"] },
				{ categoryId: expenseCategory._id.toString(), type: "expense", amount: 20, description: "E2", transactionDate: nowIso, tags: ["food"] },
				{ categoryId: expenseCategory._id.toString(), type: "expense", amount: 30, description: "E3", transactionDate: nowIso, tags: ["coffee"] },
				{ categoryId: expenseCategory._id.toString(), type: "expense", amount: 40, description: "E4", transactionDate: nowIso, tags: ["rent"] },
				{ categoryId: expenseCategory._id.toString(), type: "expense", amount: 50, description: "E5", transactionDate: nowIso, tags: ["rent"] },
				{ categoryId: incomeCategory._id.toString(), type: "income", amount: 100, description: "I1", transactionDate: nowIso, tags: ["salary"] },
				{ categoryId: incomeCategory._id.toString(), type: "income", amount: 200, description: "I2", transactionDate: nowIso, tags: ["bonus"] },
				{ categoryId: incomeCategory._id.toString(), type: "income", amount: 300, description: "I3", transactionDate: nowIso, tags: ["bonus"] },
			];

			for (const p of payloads) {
				await request(app).post("/api/v1/transactions").set("Authorization", `Bearer ${token}`).send(p).expect(201);
			}

			// Filter by expense category and amount range 25..60
			const res = await request(app)
				.get("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.query({ categoryId: expenseCategory._id.toString(), minAmount: "25", maxAmount: "60", page: "1", limit: "2", sortBy: "amount", sortOrder: "asc" })
				.expect(200);

			expect(res.body.success).toBe(true);
			expect(res.body.data.transactions.length).toBe(2);
			const pg = res.body.data.pagination;
			expect(Number(pg.page)).toBe(1);
			expect(Number(pg.limit)).toBe(2);
			expect(pg.hasNext).toBe(true);
			expect(pg.hasPrev).toBe(false);
			// Sorted ascending by amount
			const amounts = res.body.data.transactions.map(t => {
				const a = t.amount;
				return typeof a === 'number' ? a : Number(a?.$numberDecimal ?? a);
			});
			expect(amounts).toEqual([30, 40]);
		});

		it("should sort by amount desc and respect startDate/endDate filters", async () => {
			const { token, userId } = await registerAndLogin();
			const expenseCategory = await Category.findOne({ userId, type: "expense", isDefault: true, isDeleted: false });

			const dates = [
				new Date(Date.now() - 3*24*60*60*1000).toISOString(),
				new Date(Date.now() - 2*24*60*60*1000).toISOString(),
				new Date(Date.now() - 1*24*60*60*1000).toISOString(),
			];
			const amounts = [15, 35, 25];
			for (let i = 0; i < dates.length; i++) {
				await request(app).post("/api/v1/transactions").set("Authorization", `Bearer ${token}`).send({
					categoryId: expenseCategory._id.toString(),
					type: "expense",
					amount: amounts[i],
					description: `D${i+1}`,
					transactionDate: dates[i],
					tags: ["coffee"],
				}).expect(201);
			}

			const startDate = new Date(Date.now() - 3*24*60*60*1000).toISOString();
			const endDate = new Date().toISOString();
			const res = await request(app)
				.get("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.query({ startDate, endDate, sortBy: "amount", sortOrder: "desc" })
				.expect(200);

			const returned = res.body.data.transactions.map(t => {
				const a = t.amount;
				return typeof a === 'number' ? a : Number(a?.$numberDecimal ?? a);
			});
			expect(returned.length).toBeGreaterThanOrEqual(2);
			expect(returned[0]).toBe(35);
			expect(returned[1]).toBe(25);
			if (returned.length >= 3) {
				expect(returned[2]).toBe(15);
			}
		});
	});

	describe("🏷️ Tag validation via API", () => {
		it("should reject more than 3 tags", async () => {
			const { token, userId } = await registerAndLogin();
			const expenseCategory = await Category.findOne({ userId, type: "expense", isDefault: true, isDeleted: false });
			await request(app)
				.post("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.send({
					categoryId: expenseCategory._id.toString(),
					type: "expense",
					amount: 10,
					description: "Too many tags",
					transactionDate: new Date().toISOString(),
					tags: ["one","two","three","four"],
				})
				.expect(400);
		});

		it("should reject invalid tag characters", async () => {
			const { token, userId } = await registerAndLogin();
			const expenseCategory = await Category.findOne({ userId, type: "expense", isDefault: true, isDeleted: false });
			await request(app)
				.post("/api/v1/transactions")
				.set("Authorization", `Bearer ${token}`)
				.send({
					categoryId: expenseCategory._id.toString(),
					type: "expense",
					amount: 10,
					description: "Bad tag",
					transactionDate: new Date().toISOString(),
					tags: ["work_related"], // underscore not allowed
				})
				.expect(400);
		});
	});

	describe("🔗 Relation enforcement (single test)", () => {
		it("should reject creating a transaction with another user's category", async () => {
			// User A
			const { token: tokenA, userId: userA } = await registerAndLogin({ email: "rel-user-a@test.com" });
			// User B
			const { token: tokenB, userId: userB } = await registerAndLogin({ email: "rel-user-b@test.com" });

			const userBExpense = await Category.findOne({ userId: userB, type: "expense", isDefault: true, isDeleted: false });
			expect(userBExpense).toBeTruthy();

			// Try to create using User B's category with User A's token
			await request(app)
				.post("/api/v1/transactions")
				.set("Authorization", `Bearer ${tokenA}`)
				.send({
					categoryId: userBExpense._id.toString(),
					type: "expense",
					amount: 25,
					description: "Invalid category",
					transactionDate: new Date().toISOString(),
				})
				.expect(404); // CATEGORY_NOT_FOUND per service
		});
	});

	describe("📈 Summary & breakdown", () => {
		it("should return monthly summary for a known dataset", async () => {
			const { token, userId } = await registerAndLogin();
			const incomeCategory = await Category.findOne({ userId, type: "income", isDefault: true, isDeleted: false });
			const expenseCategory = await Category.findOne({ userId, type: "expense", isDefault: true, isDeleted: false });

			const monthYear = new Date();
			const y = monthYear.getFullYear();
			const m = monthYear.getMonth() + 1;

			// create transactions in same month
			await request(app).post("/api/v1/transactions").set("Authorization", `Bearer ${token}`).send({ categoryId: incomeCategory._id.toString(), type: "income", amount: 500, description: "I", transactionDate: new Date(y, m-1, 5).toISOString(), tags: ["salary"] }).expect(201);
			await request(app).post("/api/v1/transactions").set("Authorization", `Bearer ${token}`).send({ categoryId: expenseCategory._id.toString(), type: "expense", amount: 120.25, description: "E1", transactionDate: new Date(y, m-1, 10).toISOString(), tags: ["rent"] }).expect(201);
			await request(app).post("/api/v1/transactions").set("Authorization", `Bearer ${token}`).send({ categoryId: expenseCategory._id.toString(), type: "expense", amount: 79.75, description: "E2", transactionDate: new Date(y, m-1, 15).toISOString(), tags: ["food"] }).expect(201);

			const res = await request(app)
				.get("/api/v1/transactions/summary")
				.set("Authorization", `Bearer ${token}`)
				.query({ year: String(y), month: String(m) })
				.expect(200);

			expect(res.body.success).toBe(true);
			expect(res.body.data.income.total).toBe(500);
			expect(res.body.data.expenses.total).toBeCloseTo(200.0, 5);
			expect(res.body.data.netAmount).toBeCloseTo(300.0, 5);
		});

		it("should filter category breakdown by type when provided", async () => {
			const { token, userId } = await registerAndLogin();
			const incomeCategory = await Category.findOne({ userId, type: "income", isDefault: true, isDeleted: false });
			const expenseCategory = await Category.findOne({ userId, type: "expense", isDefault: true, isDeleted: false });

			const now = new Date().toISOString();
			await request(app).post("/api/v1/transactions").set("Authorization", `Bearer ${token}`).send({ categoryId: incomeCategory._id.toString(), type: "income", amount: 100, description: "I1", transactionDate: now, tags: ["salary"] }).expect(201);
			await request(app).post("/api/v1/transactions").set("Authorization", `Bearer ${token}`).send({ categoryId: expenseCategory._id.toString(), type: "expense", amount: 50, description: "E1", transactionDate: now, tags: ["rent"] }).expect(201);

			const res = await request(app)
				.get("/api/v1/transactions/category-breakdown")
				.set("Authorization", `Bearer ${token}`)
				.query({ type: "expense" })
				.expect(200);

			expect(res.body.success).toBe(true);
			for (const item of res.body.data) {
				expect(item.type).toBe("expense");
			}
		});
	});
});
