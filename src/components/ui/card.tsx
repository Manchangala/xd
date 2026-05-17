import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-soft transition dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
      {...props}
    />
  )
}
