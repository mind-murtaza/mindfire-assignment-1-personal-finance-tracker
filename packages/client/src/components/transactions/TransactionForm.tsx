import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchCategories } from "../../store/categorySlice";
import Input from "../ui/Input";
import Button from "../ui/Button";
import {
	createTransactionSchema,
	updateTransactionSchema,
	type TransactionCreateInput,
	type TransactionUpdateInput,
} from "../../lib/validation/transaction";
import type { CategoryType } from "../../lib/validation/common";

import { formatDateForInput } from "../../lib/utils/formatters";

interface Props {
	onSubmit: (data: TransactionCreateInput | TransactionUpdateInput) => void | Promise<void>;
	initial?: Partial<TransactionCreateInput>;
	busy?: boolean;
	isEditing?: boolean;
}

export default function TransactionForm({
	onSubmit,
	initial,
	busy = false,
	isEditing = false,
}: Props) {
	const dispatch = useAppDispatch();
	const { byId: categoriesById, allIds: categoryIds } = useAppSelector(
		(s) => s.categories
	);

	const [form, setForm] = useState<TransactionCreateInput>({
		categoryId: initial?.categoryId ?? "",
		amount: initial?.amount ?? 0,
		type: initial?.type ?? "expense",
		description: initial?.description ?? "",
		notes: initial?.notes ?? "",
		transactionDate: initial?.transactionDate ?? new Date(),
		tags: initial?.tags ?? [],
	});

	const [errors, setErrors] = useState<
		Partial<Record<keyof TransactionCreateInput, string>>
	>({});

	// Load categories on mount
	useEffect(() => {
		if (categoryIds.length === 0) {
			dispatch(fetchCategories({ type: undefined }));
		}
	}, [dispatch, categoryIds.length]);

	useEffect(() => {
		if (initial) {
			setForm({
				categoryId: initial.categoryId ?? "",
				amount: initial.amount ?? 0,
				type: initial.type ?? "expense",
				description: initial.description ?? "",
				notes: initial.notes ?? "",
				transactionDate: initial.transactionDate ?? new Date(),
				tags: initial.tags ?? [],
			});
			setErrors({});
		} else {
			setForm({
				categoryId: "",
				amount: 0,
				type: "expense",
				description: "",
				notes: "",
				transactionDate: new Date(),
				tags: [],
			});
		}
	}, [initial]);

	// Filter categories by selected type
	const availableCategories = categoryIds
		.map((id) => categoriesById[id])
		.filter((category) => category && category.type === form.type);

	const handleTypeChange = (type: CategoryType) => {
		setForm({ ...form, type, categoryId: "" });
	};



	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});

		// Prepare form data with proper date conversion
		const formData = {
			...form,
			transactionDate: new Date(form.transactionDate),
		};

		if (isEditing) {
			// For editing, only send editable fields (no type change allowed)
			const updateData = {
				categoryId: formData.categoryId,
				amount: formData.amount,
				description: formData.description,
				notes: formData.notes,
				transactionDate: formData.transactionDate,
				tags: formData.tags,
			};

			const parsed = updateTransactionSchema.safeParse(updateData);
			if (!parsed.success) {
				const fe = parsed.error.flatten().fieldErrors;
				setErrors({
					categoryId: fe.categoryId?.[0],
					amount: fe.amount?.[0],
					description: fe.description?.[0],
					notes: fe.notes?.[0],
					transactionDate: fe.transactionDate?.[0],
					tags: fe.tags?.[0],
				});
				return;
			}
			await onSubmit(parsed.data);
		} else {
			// For creating, send all fields
			const parsed = createTransactionSchema.safeParse(formData);
			if (!parsed.success) {
				const fe = parsed.error.flatten().fieldErrors;
				setErrors({
					categoryId: fe.categoryId?.[0],
					amount: fe.amount?.[0],
					type: fe.type?.[0],
					description: fe.description?.[0],
					notes: fe.notes?.[0],
					transactionDate: fe.transactionDate?.[0],
					tags: fe.tags?.[0],
				});
				return;
			}
			await onSubmit(parsed.data);

			// Reset form only after creating
			setForm({
				categoryId: "",
				amount: 0,
				type: "expense",
				description: "",
				notes: "",
				transactionDate: new Date(),
				tags: [],
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6" noValidate>
			<div>
				<span className="block text-sm font-medium text-neutral-700 mb-2">
					Transaction Type
				</span>
				{isEditing ? (
					<div className="px-3 py-2 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600 capitalize">
						{form.type}
					</div>
				) : (
					<div className="flex gap-3">
						{(["expense", "income"] as const).map((type) => (
							<button
								key={type}
								type="button"
								onClick={() => handleTypeChange(type)}
								className={`flex-1 px-4 py-3 rounded-md border text-sm font-medium capitalize transition-colors ${
									form.type === type
										? "border-primary-200 bg-primary-50 text-primary-700"
										: "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
								}`}
							>
								{type}
							</button>
						))}
					</div>
				)}
				{errors.type && (
					<p className="mt-1 text-sm text-error-600">{errors.type}</p>
				)}
			</div>

			{/* Category Selection */}
			<div>
				<label
					htmlFor="categoryId"
					className="block text-sm font-medium text-neutral-700 mb-2"
				>
					Category
				</label>
				<select
					id="categoryId"
					value={form.categoryId}
					onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
					className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
						errors.categoryId
							? "border-error-300 focus:ring-error-500 focus:border-error-500"
							: "border-neutral-300"
					}`}
					aria-invalid={!!errors.categoryId}
					aria-describedby={errors.categoryId ? "category-error" : undefined}
				>
					<option value="">
						{availableCategories.length > 0
							? "Select a category"
							: `No ${form.type} categories available`}
					</option>
					{availableCategories.map((category) => (
						<option key={category.id} value={category.id}>
							{category.name}
						</option>
					))}
				</select>
				{errors.categoryId && (
					<p id="category-error" className="mt-1 text-sm text-error-600">
						{errors.categoryId}
					</p>
				)}
				{availableCategories.length === 0 && form.type && (
					<p className="mt-1 text-sm text-info-600">
						Create a {form.type} category first in the Categories page.
					</p>
				)}
			</div>

			{/* Amount */}
			<div>
				<label
					htmlFor="amount"
					className="block text-sm font-medium text-neutral-700 mb-2"
				>
					Amount ($)
				</label>
				<Input
					id="amount"
					type="number"
					step="0.01"
					min="0.01"
					value={form.amount || ""}
					onChange={(e) =>
						setForm({ ...form, amount: Number(e.target.value) || 0 })
					}
					placeholder="0.00"
					aria-invalid={!!errors.amount}
					aria-describedby={errors.amount ? "amount-error" : undefined}
				/>
				{errors.amount && (
					<p id="amount-error" className="mt-1 text-sm text-error-600">
						{errors.amount}
					</p>
				)}
			</div>

			{/* Description */}
			<div>
				<label
					htmlFor="description"
					className="block text-sm font-medium text-neutral-700 mb-2"
				>
					Description
				</label>
				<Input
					id="description"
					value={form.description}
					onChange={(e) => setForm({ ...form, description: e.target.value })}
					placeholder="What was this transaction for?"
					aria-invalid={!!errors.description}
					aria-describedby={errors.description ? "description-error" : undefined}
				/>
				{errors.description && (
					<p id="description-error" className="mt-1 text-sm text-error-600">
						{errors.description}
					</p>
				)}
			</div>

			{/* Transaction Date */}
			<div>
				<label
					htmlFor="transactionDate"
					className="block text-sm font-medium text-neutral-700 mb-2"
				>
					Transaction Date & Time
				</label>
				<Input
					id="transactionDate"
					type="datetime-local"
					value={formatDateForInput(new Date(form.transactionDate))}
					onChange={(e) =>
						setForm({ ...form, transactionDate: new Date(e.target.value) })
					}
					aria-invalid={!!errors.transactionDate}
					aria-describedby={
						errors.transactionDate ? "date-error" : undefined
					}
				/>
				{errors.transactionDate && (
					<p id="date-error" className="mt-1 text-sm text-error-600">
						{errors.transactionDate}
					</p>
				)}
			</div>

			{/* Notes (Optional) */}
			<div>
				<label
					htmlFor="notes"
					className="block text-sm font-medium text-neutral-700 mb-2"
				>
					Notes (Optional)
				</label>
				<textarea
					id="notes"
					value={form.notes || ""}
					onChange={(e) => setForm({ ...form, notes: e.target.value })}
					placeholder="Additional notes about this transaction..."
					rows={3}
					className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
						errors.notes
							? "border-error-300 focus:ring-error-500 focus:border-error-500"
							: "border-neutral-300"
					}`}
					aria-invalid={!!errors.notes}
					aria-describedby={errors.notes ? "notes-error" : undefined}
				/>
				{errors.notes && (
					<p id="notes-error" className="mt-1 text-sm text-error-600">
						{errors.notes}
					</p>
				)}
			</div>

			{/* Submit Button */}
			<div className="pt-4">
				<Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
					{busy
						? "Saving..."
						: isEditing
						? "Update Transaction"
						: "Create Transaction"}
				</Button>
			</div>
		</form>
	);
}
