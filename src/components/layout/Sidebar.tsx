import { NavLink } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { navItems } from '@/components/layout/navigation'
import { useAuthStore } from '@/features/auth/store/authStore'
import { ROLE_LABELS } from '@/lib/constants'
import { getAppSettings } from '@/lib/api/config'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const role = useAuthStore((state) => state.session?.user.rol)
  const items = navItems.filter((item) => role && item.roles.includes(role))
  const dataSource = getAppSettings().dataSource

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3 px-3">
        <div className="rounded-2xl bg-brand-700 p-2 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold">CurriculaPath</p>
          <p className="text-xs text-slate-500">Simulador dinámico</p>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-100'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900',
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
    </aside>
  )
}
