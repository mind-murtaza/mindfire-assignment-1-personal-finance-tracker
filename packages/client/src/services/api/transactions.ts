import { http } from "../http";
import { createLogger } from "../../lib/logger";
import type {
	TransactionCreateInput,
	TransactionUpdateInput,
	TransactionListQuery,
	TransactionSummaryQuery,
	TransactionBreakdownQuery,
	TransactionCloneOverrides,
} from "../../lib/validation/transaction";

const log = createLogger("api:transactions");

export interface Transaction {
	_id: string;
	amount: {
		$numberDecimal: number;
	};
	type: "income" | "expense";
	categoryId: {
		_id?: string;
		name: string;
		icon: string;
		color: string;
		type: "income" | "expense";
	};
	description: string;
	notes?: string;
	transactionDate: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface TransactionSummary {
	totalIncome: number;
	totalExpenses: number;
	incomeCount: number;
	expenseCount: number;
	netAmount: number;
}

export interface TransactionListResponse {
	transactions: Transaction[];
	total: number;
	summary: TransactionSummary;
	pagination: {
		page: number;
		limit: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

export interface CategoryBreakdown {
	categoryId: string;
	categoryName: string;
	categoryColor: string;
	categoryIcon: string;
	type: "income" | "expense";
	total: number;
	count: number;
	avgAmount: number;
}

type ListResponse = { success?: boolean; data?: TransactionListResponse };
type ItemResponse = { success?: boolean; data?: Transaction };
type SummaryResponse = {
	success?: boolean;
	data?: {
		year?: number;
		month?: number;
		yearMonth?: string;
		income: { total: number; count: number; avgAmount: number };
		expenses: { total: number; count: number; avgAmount: number };
		netAmount: number;
	};
};
type BreakdownResponse = { success?: boolean; data?: CategoryBreakdown[] };

export async function listTransactions(
	query?: Partial<TransactionListQuery>
): Promise<TransactionListResponse> {
	log.debug("list", query);
	const res = await http.get<ListResponse>("/transactions", { params: query });
	return (
		res.data.data ?? {
			transactions: [],
			total: 0,
			summary: {
				totalIncome: 0,
				totalExpenses: 0,
				incomeCount: 0,
				expenseCount: 0,
				netAmount: 0,
			},
			pagination: {
				page: 1,
				limit: 20,
				totalPages: 0,
				hasNext: false,
				hasPrev: false,
			},
		}
	);
}

export async function createTransaction(
	payload: TransactionCreateInput
): Promise<Transaction> {
	log.info("create");
	const res = await http.post<ItemResponse>("/transactions", payload);
	if (!res.data.data) throw new Error("No transaction in response");
	return res.data.data;
}

export async function getTransaction(id: string): Promise<Transaction> {
	log.debug("get", id);
	const res = await http.get<ItemResponse>(`/transactions/${id}`);
	if (!res.data.data) throw new Error("No transaction in response");
	return res.data.data;
}

export async function updateTransaction(
	id: string,
	payload: TransactionUpdateInput
): Promise<Transaction> {
	log.info("update", id);
	const res = await http.patch<ItemResponse>(`/transactions/${id}`, payload);
	if (!res.data.data) throw new Error("No transaction in response");
	return res.data.data;
}

export async function deleteTransaction(id: string): Promise<void> {
	log.warn("delete", id);
	await http.delete(`/transactions/${id}`);
}

export async function getTransactionSummary(
	query?: TransactionSummaryQuery
): Promise<SummaryResponse["data"]> {
	log.debug("summary", query);
	const res = await http.get<SummaryResponse>("/transactions/summary", {
		params: query,
	});
	return res.data.data;
}

export async function getCategoryBreakdown(
	query?: TransactionBreakdownQuery
): Promise<CategoryBreakdown[]> {
	log.debug("breakdown", query);
	const res = await http.get<BreakdownResponse>(
		"/transactions/category-breakdown",
		{ params: query }
	);
	return res.data.data ?? [];
}

export async function cloneTransaction(
	id: string,
	overrides?: TransactionCloneOverrides
): Promise<Transaction> {
	log.info("clone", id);
	const res = await http.post<ItemResponse>(
		`/transactions/${id}/clone`,
		overrides
	);
	if (!res.data.data) throw new Error("No transaction in response");
	return res.data.data;
}
