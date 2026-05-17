import { AlertTriangle, Inbox } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 ${className}`} />
}

export function LoadingBlock() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center text-center">
      <Inbox className="mb-3 h-8 w-8 text-slate-400" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </Card>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        <span>{message}</span>
      </div>
    </Card>
  )
}
