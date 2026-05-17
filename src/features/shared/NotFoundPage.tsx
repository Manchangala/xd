import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/features/auth/store/authStore'

export function NotFoundPage() {
  const role = useAuthStore((state) => state.session?.user.rol)
  const fallbackPath =
    role === 'admin' ? '/admin' : role === 'advisor' ? '/asesor' : '/dashboard'
  const fallbackLabel =
    role === 'admin'
      ? 'Volver a administración'
      : role === 'advisor'
        ? 'Volver a asesoría'
        : 'Volver al dashboard'

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
          404
        </p>
        <h2 className="mt-2 text-3xl font-bold">Ruta no encontrada</h2>
        <p className="mt-3 text-slate-500">
          La página que buscas no existe o todavía no forma parte del flujo actual.
        </p>
        <Link to={fallbackPath}>
          <Button className="mt-5">{fallbackLabel}</Button>
        </Link>
      </Card>
    </div>
  )
}
