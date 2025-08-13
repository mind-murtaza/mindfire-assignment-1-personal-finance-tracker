import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-500',
        className,
      )}
      {...props}
    />
  )
}

export default Input

