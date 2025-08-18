import { useState } from "react";
import { useAppDispatch } from "../../../store/hooks";
import {
	createTransactionThunk,
	updateTransactionThunk,
	deleteTransactionThunk,
} from "../../../store/transactionSlice";
import type { TransactionCreateInput, TransactionUpdateInput } from "../../../lib/validation/transaction";

type MessageType = "success" | "warning" | "error" | "info" | null;

/**
 * Hook for managing transaction mutations (create, update, delete)
 * Encapsulates mutation logic and user feedback
 */
export function useTransactionMutations() {
	const dispatch = useAppDispatch();
	const [message, setMessage] = useState<string | null>(null);
	const [messageType, setMessageType] = useState<MessageType>(null);

	const clearMessage = () => {
		setMessage(null);
		setMessageType(null);
	};

	const createTransaction = async (data: TransactionCreateInput) => {
		setMessage(null);
		const result = await dispatch(createTransactionThunk(data));
		
		if (createTransactionThunk.fulfilled.match(result)) {
			setMessage("Transaction created successfully");
			setMessageType("success");
			return { success: true, data: result.payload };
		} else {
			setMessage("Failed to create transaction");
			setMessageType("error");
			return { success: false, error: result.payload };
		}
	};

	const updateTransaction = async (id: string, data: TransactionUpdateInput) => {
		setMessage(null);
		const result = await dispatch(updateTransactionThunk({ id, payload: data }));
		
		if (updateTransactionThunk.fulfilled.match(result)) {
			setMessage("Transaction updated successfully");
			setMessageType("success");
			return { success: true, data: result.payload };
		} else {
			setMessage("Failed to update transaction");
			setMessageType("error");
			return { success: false, error: result.payload };
		}
	};

	const deleteTransaction = async (id: string, description?: string) => {
		const name = description ?? "this transaction";
		const confirmed = window.confirm(
			`Are you sure you want to delete "${name}"? This action cannot be undone.`
		);
		
		if (!confirmed) {
			return { success: false, cancelled: true };
		}

		const result = await dispatch(deleteTransactionThunk(id));
		
		if (deleteTransactionThunk.fulfilled.match(result)) {
			setMessage("Transaction deleted successfully");
			setMessageType("info");
			return { success: true };
		} else {
			setMessage("Failed to delete transaction");
			setMessageType("error");
			return { success: false, error: result.payload };
		}
	};

	return {
		message,
		messageType,
		clearMessage,
		createTransaction,
		updateTransaction,
		deleteTransaction,
	};
}
