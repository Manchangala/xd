import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'

export function RequireAuth() {
  const session = useAuthStore((state) => state.session)
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
