import { createSlice, createAsyncThunk, current } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
	listTransactions,
	createTransaction,
	getTransaction,
	updateTransaction,
	deleteTransaction,
	getTransactionSummary,
	getCategoryBreakdown,
	cloneTransaction,
	type Transaction,
	type TransactionListResponse,
	type TransactionSummary,
	type CategoryBreakdown,
} from "../services/api/transactions";
import type {
	TransactionCreateInput,
	TransactionUpdateInput,
	TransactionListQuery,
	TransactionSummaryQuery,
	TransactionBreakdownQuery,
	TransactionCloneOverrides,
} from "../lib/validation/transaction";
import { createLogger } from "../lib/logger";

const log = createLogger("transactions");

// Serializable version of TransactionListQuery for Redux state
type SerializableTransactionListQuery = Omit<TransactionListQuery, 'startDate' | 'endDate'> & {
	startDate?: string | Date; // Allow both for transition
	endDate?: string | Date;   // Allow both for transition
};

export interface TransactionsState {
	// Normalized state
	byId: Record<string, Transaction>;
	allIds: string[];
	
	// Metadata
	total: number;
	summary: TransactionSummary | null;
	pagination: {
		page: number;
		limit: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
	
	// Loading states
	status: "idle" | "loading" | "succeeded" | "failed";
	summaryStatus: "idle" | "loading" | "succeeded" | "failed";
	breakdownStatus: "idle" | "loading" | "succeeded" | "failed";
	
	// Filters (for UI state) - uses serializable version
	currentFilters: Partial<SerializableTransactionListQuery>;
	
	// Category breakdown
	categoryBreakdown: CategoryBreakdown[];
	
	// Error handling
	error: string | null;
}

const initialState: TransactionsState = {
	byId: {},
	allIds: [],
	total: 0,
	summary: null,
	pagination: {
		page: 1,
		limit: 20,
		totalPages: 0,
		hasNext: false,
		hasPrev: false,
	},
	status: "idle",
	summaryStatus: "idle",
	breakdownStatus: "idle",
	currentFilters: {},
	categoryBreakdown: [],
	error: null,
};

// Async thunks
export const fetchTransactions = createAsyncThunk(
	"transactions/fetchAll",
	async (query: Partial<TransactionListQuery> = {}, { rejectWithValue }) => {
		try {
			// Create a copy and convert ISO strings back to Date objects for API call
			const apiQuery = { ...query };
			if (typeof apiQuery.startDate === 'string') {
				apiQuery.startDate = new Date(apiQuery.startDate);
			}
			if (typeof apiQuery.endDate === 'string') {
				apiQuery.endDate = new Date(apiQuery.endDate);
			}
			
			if (!apiQuery.startDate && !apiQuery.endDate) {
				const now = new Date();
				const sevenDaysAgo = new Date(now);
				sevenDaysAgo.setDate(now.getDate() - 7);
				apiQuery.startDate = sevenDaysAgo;
				apiQuery.endDate = now;
			}
			const res = await listTransactions(apiQuery);
			return res;
		} catch (error) {
			log.error("fetchAll failed", error);
			return rejectWithValue("Failed to load transactions");
		}
	}
);

export const createTransactionThunk = createAsyncThunk(
	"transactions/create",
	async (payload: TransactionCreateInput, { rejectWithValue }) => {
		try {
			return await createTransaction(payload);
		} catch (error) {
			log.error("create failed", error);
			return rejectWithValue("Failed to create transaction");
		}
	}
);

export const getTransactionThunk = createAsyncThunk(
	"transactions/getById",
	async (id: string, { rejectWithValue }) => {
		try {
			return await getTransaction(id);
		} catch (error) {
			log.error("getById failed", error);
			return rejectWithValue("Failed to load transaction");
		}
	}
);

export const updateTransactionThunk = createAsyncThunk(
	"transactions/update",
	async (
		params: { id: string; payload: TransactionUpdateInput },
		{ rejectWithValue }
	) => {
		try {
			return await updateTransaction(params.id, params.payload);
		} catch (error) {
			log.error("update failed", error);
			return rejectWithValue("Failed to update transaction");
		}
	}
);

export const deleteTransactionThunk = createAsyncThunk(
	"transactions/delete",
	async (id: string, { rejectWithValue }) => {
		try {
			await deleteTransaction(id);
			return id;
		} catch (error) {
			log.error("delete failed", error);
			return rejectWithValue("Failed to delete transaction");
		}
	}
);

export const fetchTransactionSummary = createAsyncThunk(
	"transactions/fetchSummary",
	async (query: TransactionSummaryQuery = {}, { rejectWithValue }) => {
		try {
			return await getTransactionSummary(query);
		} catch (error) {
			log.error("fetchSummary failed", error);
			return rejectWithValue("Failed to load summary");
		}
	}
);

export const fetchCategoryBreakdown = createAsyncThunk(
	"transactions/fetchBreakdown",
	async (query: TransactionBreakdownQuery = {}, { rejectWithValue }) => {
		try {
			return await getCategoryBreakdown(query);
		} catch (error) {
			log.error("fetchBreakdown failed", error);
			return rejectWithValue("Failed to load category breakdown");
		}
	}
);

export const loadMoreTransactions = createAsyncThunk(
	"transactions/loadMore",
	async (query: Partial<TransactionListQuery> = {}, { rejectWithValue, getState }) => {
		try {
			const state = getState() as { transactions: TransactionsState };
			const nextPage = state.transactions.pagination.page + 1;
			
			// Create a copy and convert ISO strings back to Date objects for API call
			const apiQuery = { ...query };
			if (typeof apiQuery.startDate === 'string') {
				apiQuery.startDate = new Date(apiQuery.startDate);
			}
			if (typeof apiQuery.endDate === 'string') {
				apiQuery.endDate = new Date(apiQuery.endDate);
			}
			
			// Default to last 7 days if no date filters
			if (!apiQuery.startDate && !apiQuery.endDate) {
				const now = new Date();
				const sevenDaysAgo = new Date(now);
				sevenDaysAgo.setDate(now.getDate() - 7);
				apiQuery.startDate = sevenDaysAgo;
				apiQuery.endDate = now;
			}
			
			const res = await listTransactions({ ...apiQuery, page: nextPage });
			return res;
		} catch (error) {
			log.error("loadMore failed", error);
			return rejectWithValue("Failed to load more transactions");
		}
	}
);

export const cloneTransactionThunk = createAsyncThunk(
	"transactions/clone",
	async (
		params: { id: string; overrides?: TransactionCloneOverrides },
		{ rejectWithValue }
	) => {
		try {
			return await cloneTransaction(params.id, params.overrides);
		} catch (error) {
			log.error("clone failed", error);
			return rejectWithValue("Failed to clone transaction");
		}
	}
);

const recalculateSummaryOnTransactionUpdate = (state: TransactionsState, oldTransaction: Transaction, newTransaction: Transaction) => {
	updateSummary(state, oldTransaction, "subtract");
	updateSummary(state, newTransaction, "add");
}

const updateSummary = (state: TransactionsState, transaction: Transaction, action: "add" | "subtract" = "add") => {
	if (!state.summary) {
		state.summary = {
			totalIncome: 0,
			totalExpenses: 0,
			incomeCount: 0,
			expenseCount: 0,
			netAmount: 0,
		}
	}
	
	const amount = Number(transaction.amount.$numberDecimal);
	
	if (action === "add") {
		if (transaction.type === "income") {
			state.summary.totalIncome += amount;
			state.summary.incomeCount += 1;
		} else {
			state.summary.totalExpenses += amount;
			state.summary.expenseCount += 1;
		}
	} else if (action === "subtract") {
		if (transaction.type === "income") {
			state.summary.totalIncome -= amount;
			state.summary.incomeCount -= 1;
		} else {
			state.summary.totalExpenses -= amount;
			state.summary.expenseCount -= 1;
		}
	}
	
	state.summary.netAmount = state.summary.totalIncome - state.summary.totalExpenses;
}

const slice = createSlice({
	name: "transactions",
	initialState,
	reducers: {
		setFilters(state, action: PayloadAction<Partial<SerializableTransactionListQuery>>) {
			const filters: Partial<SerializableTransactionListQuery> = { ...action.payload };
			// Convert Date objects to ISO strings for Redux serialization
			if (filters.startDate instanceof Date) {
				filters.startDate = filters.startDate.toISOString();
			}
			if (filters.endDate instanceof Date) {
				filters.endDate = filters.endDate.toISOString();
			}
			state.currentFilters = { ...state.currentFilters, ...filters };
		},
		clearFilters(state) {
			state.currentFilters = {};
		},
		upsertMany(state, action: PayloadAction<Transaction[]>) {
			for (const transaction of action.payload) {
				state.byId[transaction._id] = transaction;
				if (!state.allIds.includes(transaction._id)) {
					state.allIds.push(transaction._id);
				}
			}
		},
		clear(state) {
			state.byId = {};
			state.allIds = [];
			state.total = 0;
			state.summary = null;
			state.categoryBreakdown = [];
			state.currentFilters = {};
			state.status = "idle";
			state.summaryStatus = "idle";
			state.breakdownStatus = "idle";
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch transactions
			.addCase(fetchTransactions.pending, (state) => {
				state.status = "loading";
				state.error = null;
			})
			.addCase(
				fetchTransactions.fulfilled,
				(state, action: PayloadAction<TransactionListResponse>) => {
					state.status = "succeeded";
					const { transactions, total, pagination } = action.payload;
					state.summary = null;
					// Clear existing data for fresh fetch
					state.byId = {};
					state.allIds = [];
					for (const transaction of transactions) {
						updateSummary(state, transaction);
						state.byId[transaction._id] = transaction;
						state.allIds.push(transaction._id);
					}
					
					state.total = total;
					state.pagination = pagination;
				}
			)
			.addCase(fetchTransactions.rejected, (state, action) => {
				state.status = "failed";
				state.error = (action.payload as string) ?? "Failed to load transactions";
			})

			// Load more transactions (append to existing)
			.addCase(loadMoreTransactions.pending, (state) => {
				state.status = "loading";
				state.error = null;
			})
			.addCase(
				loadMoreTransactions.fulfilled,
				(state, action: PayloadAction<TransactionListResponse>) => {
					state.status = "succeeded";
					const { transactions, total, pagination } = action.payload;
					
					// Append new transactions (don't clear existing)
					for (const transaction of transactions) {
						if (!state.byId[transaction._id]) {
							updateSummary(state, transaction);
							state.byId[transaction._id] = transaction;
							state.allIds.push(transaction._id);
						}
					}
					
					state.total = total;
					state.pagination = pagination;
				}
			)
			.addCase(loadMoreTransactions.rejected, (state, action) => {
				state.status = "failed";
				state.error = (action.payload as string) ?? "Failed to load more transactions";
			})

					// Create transaction
		.addCase(createTransactionThunk.pending, (state) => {
			state.error = null;
		})
		.addCase(
			createTransactionThunk.fulfilled,
			(state, action: PayloadAction<Transaction>) => {
				const transaction = action.payload;
				state.byId[transaction._id] = transaction;
				state.allIds.unshift(transaction._id);
				state.total += 1;
				updateSummary(state, transaction);
			}
		)
		.addCase(createTransactionThunk.rejected, (state, action) => {
			state.error = (action.payload as string) ?? "Failed to create transaction";
		})

			// Get transaction by ID
			.addCase(
				getTransactionThunk.fulfilled,
				(state, action: PayloadAction<Transaction>) => {
					const transaction = action.payload;
					state.byId[transaction._id] = transaction;
					if (!state.allIds.includes(transaction._id)) {
						state.allIds.push(transaction._id);
						updateSummary(state, transaction);
					}
				}
			)

					// Update transaction
		.addCase(updateTransactionThunk.pending, (state) => {
			state.error = null;
		})
		.addCase(
			updateTransactionThunk.fulfilled,
			(state, action: PayloadAction<Transaction>) => {
				const newTransaction = action.payload;
				const oldTransactionProxy = state.byId[newTransaction._id];
				const oldTransaction = oldTransactionProxy ? current(oldTransactionProxy) : null;
				if (oldTransaction) {
					recalculateSummaryOnTransactionUpdate(state, oldTransaction, newTransaction);
				} else {
					updateSummary(state, newTransaction, "add");
				}
				state.byId[newTransaction._id] = newTransaction;
				if (!state.allIds.includes(newTransaction._id)) {
					state.allIds.push(newTransaction._id);
				}
			}
		)
		.addCase(updateTransactionThunk.rejected, (state, action) => {
			state.error = (action.payload as string) ?? "Failed to update transaction";
		})

					// Delete transaction
		.addCase(deleteTransactionThunk.pending, (state) => {
			state.error = null;
		})
		.addCase(
			deleteTransactionThunk.fulfilled,
			(state, action: PayloadAction<string>) => {
				const id = action.payload;
				const transaction = state.byId[id];
				delete state.byId[id];
				state.allIds = state.allIds.filter((x) => x !== id);
				state.total -= 1;
				updateSummary(state, transaction, "subtract");
			}
		)
		.addCase(deleteTransactionThunk.rejected, (state, action) => {
			state.error = (action.payload as string) ?? "Failed to delete transaction";
		})

					// Clone transaction
		.addCase(cloneTransactionThunk.pending, (state) => {
			state.error = null;
		})
		.addCase(
			cloneTransactionThunk.fulfilled,
			(state, action: PayloadAction<Transaction>) => {
				const transaction = action.payload;
				state.byId[transaction._id] = transaction;
				state.allIds.unshift(transaction._id); // Add to beginning
				state.total += 1;
				updateSummary(state, transaction);
			}
		)
		.addCase(cloneTransactionThunk.rejected, (state, action) => {
			state.error = (action.payload as string) ?? "Failed to clone transaction";
		})

			// Summary
			.addCase(fetchTransactionSummary.pending, (state) => {
				state.summaryStatus = "loading";
			})
			.addCase(fetchTransactionSummary.fulfilled, (state, action) => {
				state.summaryStatus = "succeeded";
				if (action.payload) {
					// Extract summary from monthly/yearly response
					const { income, expenses, netAmount } = action.payload;
					state.summary = {
						totalIncome: income.total,
						totalExpenses: expenses.total,
						incomeCount: income.count,
						expenseCount: expenses.count,
						netAmount,
					};
				}
			})
			.addCase(fetchTransactionSummary.rejected, (state) => {
				state.summaryStatus = "failed";
			})

			// Category breakdown
			.addCase(fetchCategoryBreakdown.pending, (state) => {
				state.breakdownStatus = "loading";
			})
			.addCase(
				fetchCategoryBreakdown.fulfilled,
				(state, action: PayloadAction<CategoryBreakdown[]>) => {
					state.breakdownStatus = "succeeded";
					state.categoryBreakdown = action.payload;
				}
			)
			.addCase(fetchCategoryBreakdown.rejected, (state) => {
				state.breakdownStatus = "failed";
			});
	},
});

export const { setFilters, clearFilters, upsertMany, clear } = slice.actions;
export default slice.reducer;
