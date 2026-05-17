import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { ToastContext, type Toast } from '@/components/ui/toast-context'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const value = useMemo(
    () => ({
      pushToast: (toast: Omit<Toast, 'id'>) => {
        const id = crypto.randomUUID()
        setToasts((current) => [...current, { ...toast, id }])
        window.setTimeout(
          () => setToasts((current) => current.filter((item) => item.id !== id)),
          3200,
        )
      },
    }),
    [],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm text-slate-500">{toast.description}</p>
                ) : null}
              </div>
              <button
                aria-label="Cerrar notificación"
                onClick={() =>
                  setToasts((current) => current.filter((item) => item.id !== toast.id))
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
