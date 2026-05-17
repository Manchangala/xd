import { NavLink } from 'react-router-dom'
import { GraduationCap, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { navItems } from '@/components/layout/navigation'
import { useAuthStore } from '@/features/auth/store/authStore'
import { ROLE_LABELS } from '@/lib/constants'
import { getAppSettings } from '@/lib/api/config'
import { cn } from '@/lib/utils'

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const role = useAuthStore((state) => state.session?.user.rol)
  const items = navItems.filter((item) => role && item.roles.includes(role))
  const dataSource = getAppSettings().dataSource

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden">
      <div className="flex h-full w-[min(20rem,calc(100vw-1rem))] flex-col bg-white p-4 shadow-2xl dark:bg-slate-950">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-700 p-2 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">CurriculaPath</p>
              <p className="text-xs text-slate-500">Simulador dinámico</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 overflow-y-auto">
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium',
                  isActive
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Modo activo
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Badge>{role ? ROLE_LABELS[role] : 'Sin rol'}</Badge>
            <span className="text-xs text-slate-500">
              {dataSource === 'api' ? 'API real' : 'Mocks locales'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
