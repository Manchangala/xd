import { LogOut, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { authService } from '@/features/auth/services/authService'
import { useAuthStore } from '@/features/auth/store/authStore'
import { ROLE_LABELS } from '@/lib/constants'

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const session = useAuthStore((state) => state.session)
  const clearSession = useAuthStore((state) => state.clearSession)
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:px-8">
      <div className="flex items-center gap-3">
        <button className="lg:hidden" onClick={onMenuClick} aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm text-slate-500">Bienvenido</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold">{session?.user.nombre}</h1>
            {session?.user.rol ? <Badge>{ROLE_LABELS[session.user.rol]}</Badge> : null}
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await authService.logout()
          clearSession()
          navigate('/login')
        }}
      >
        <LogOut className="h-4 w-4" />
        Salir
      </Button>
    </header>
  )
}
