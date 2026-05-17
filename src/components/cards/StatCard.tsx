import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string | number
  hint: string
  icon: LucideIcon
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-700 to-rose-300" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{hint}</p>
        </div>
        <div className="rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-950/40 dark:text-brand-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}
