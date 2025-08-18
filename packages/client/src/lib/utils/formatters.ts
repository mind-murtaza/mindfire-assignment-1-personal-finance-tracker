/**
 * Utility functions for formatting data consistently across the application
 */

export const CURRENCY = {
    INR: "₹",
    USD: "$",
    EUR: "€"
};

/**
 * Format amount with proper sign based on transaction type
 * @param amount - The amount to format
 * @param type - Transaction type (income or expense)
 * @returns Formatted amount string with sign and currency
 */
export function formatAmount(amount: number, type: "income" | "expense"): string {
	const sign = type === "income" ? "+" : "-";
	return `${sign}${CURRENCY.INR}${Math.abs(amount).toFixed(2)}`;
}

/**
 * Format date for display in various contexts
 * @param dateString - ISO date string
 * @param format - Format type
 * @returns Formatted date string
 */
export function formatDate(
	dateString: string,
	format: "short" | "long" | "table" = "short"
): string {
	const date = new Date(dateString);

	switch (format) {
		case "short":
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		case "table":
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		case "long":
			return date.toLocaleString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});
		default:
			return date.toLocaleDateString();
	}
}

/**
 * Format date for datetime-local input
 * @param date - Date object
 * @returns Formatted string for datetime-local input
 */
export function formatDateForInput(date: Date): string {
	const d = new Date(date);
	d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
	return d.toISOString().slice(0, 16);
}

/**
 * Format currency amount without sign (for display purposes)
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
	return `$${Math.abs(amount).toFixed(2)}`;
}

/**
 * Format number with proper locale formatting
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 2): string {
	return value.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

/**
 * Get color classes for transaction type
 * @param type - Transaction type
 * @returns Object with text and background color classes
 */
export function getTransactionTypeColors(type: "income" | "expense") {
	return type === "income"
		? {
				text: "text-success-600",
				bg: "bg-success-50",
				border: "border-success-200",
		  }
		: {
				text: "text-error-600",
				bg: "bg-error-50",
				border: "border-error-200",
		  };
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + "...";
}
