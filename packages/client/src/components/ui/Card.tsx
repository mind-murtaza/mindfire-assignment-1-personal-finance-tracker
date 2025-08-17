import type { HTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { cn } from '../../lib/utils/cn'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'

export default Card


