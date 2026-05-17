import { cn } from '@/lib/utils'

export function ProgressBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const normalized = Math.min(100, Math.max(0, value))

  return (
    <div
      className={cn(
        'h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-700 to-rose-400 transition-all"
        style={{ width: `${normalized}%` }}
      />
    </div>
  )
}
