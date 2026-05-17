import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-brand-900/40',
        className,
      )}
      {...props}
    />
  )
}
