import { ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function AccessDenied({ role }: { role: string }) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center text-center">
      <ShieldAlert className="mb-3 h-9 w-9 text-brand-700" />
      <h3 className="text-xl font-semibold">Acceso restringido</h3>
      <p className="mt-2 max-w-md text-slate-500">
        Esta vista está reservada para el rol {role}. La interfaz oculta las
        opciones no permitidas y la API también valida sesión y permisos por rol.
      </p>
    </Card>
  )
}
