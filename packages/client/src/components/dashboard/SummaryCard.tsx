import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { formatCurrency, getTransactionTypeColors } from '../../lib/utils/formatters'
import { Card } from '../ui/Card'

interface SummaryCardProps {
  title: string
  amount: number
  trend?: number
  type: 'income' | 'expense'
  count?: number
  isLoading?: boolean
  icon: React.ComponentType<LucideProps>
}

export default function SummaryCard({
  title,
  amount,
  trend = 0,
  type,
  count,
  isLoading,
  icon: Icon,
}: SummaryCardProps) {
  const colors = getTransactionTypeColors(type)
  const isPositiveTrend = trend >= 0
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown
  const trendColor = isPositiveTrend ? 'text-success-600' : 'text-error-600'

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-neutral-200 rounded w-24"></div>
            <div className="h-8 w-8 bg-neutral-200 rounded"></div>
          </div>
          <div className="h-8 bg-neutral-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-neutral-200 rounded w-20"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon 
            className={`h-5 w-5 ${colors.text}`} 
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span 
            className="text-2xl font-semibold text-neutral-900"
            aria-label={`${title}: ${formatCurrency(amount)}`}
          >
            {formatCurrency(amount)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          {count !== undefined && (
            <span className="text-sm text-neutral-600">
              {count} transaction{count !== 1 ? 's' : ''}
            </span>
          )}
          
          {trend !== 0 && (
            <div className="flex items-center gap-1">
              <TrendIcon 
                className={`h-4 w-4 ${trendColor}`}
                aria-hidden="true"
              />
              <span 
                className={`text-sm font-medium ${trendColor}`}
                aria-label={`${isPositiveTrend ? 'Increased' : 'Decreased'} by ${Math.abs(trend).toFixed(1)} percent from last month`}
              >
                {Math.abs(trend).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
