import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)}
      {...props}
    />
  )
}

export default Card


