import type { ReactNode } from 'react'
import { AccessDenied } from '@/components/ui/access'
import { useAuthStore } from '@/features/auth/store/authStore'
import type { UserRole } from '@/types/auth'

export function RequireRole({
  allowedRoles,
  fallbackRoleLabel,
  children,
}: {
  allowedRoles: UserRole[]
  fallbackRoleLabel: string
  children: ReactNode
}) {
  const role = useAuthStore((state) => state.session?.user.rol)

  return role && allowedRoles.includes(role) ? (
    children
  ) : (
    <AccessDenied role={fallbackRoleLabel} />
  )
}
