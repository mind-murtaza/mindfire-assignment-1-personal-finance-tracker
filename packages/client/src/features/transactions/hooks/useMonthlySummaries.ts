import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getTransactionSummary } from '../../../services/api/transactions';

/**
 * A custom hook to fetch transaction summaries for the last N months.
 * @param monthsCount The number of previous months to fetch data for.
 * @returns An object containing the aggregated query results, loading state, and error state.
 */
export function useMonthlySummaries(monthsCount: number = 6) {
  const currentDate = new Date();

  const months = useMemo(() => {
    const monthsArray: { year: number; month: number; label: string }[] = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      monthsArray.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      });
    }
    return monthsArray;
  }, [monthsCount, currentDate]);

  const monthlyQueries = useQueries({
    queries: months.map(({ year, month }) => ({
      queryKey: ['monthly-summary', year, month],
      queryFn: () => getTransactionSummary({ year, month }),
    })),
  });

  const isLoading = monthlyQueries.some((query) => query.isLoading);
  const isError = monthlyQueries.some((query) => query.isError);
  const data = monthlyQueries.map((query, index) => ({
    ...months[index],
    summary: query.data,
  }));

  return { data, isLoading, isError, months };
}
