import {
  BarChart3,
  Bot,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  SplitSquareHorizontal,
  UploadCloud,
  UserRound,
  UsersRound,
  Waypoints,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/types/auth'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  roles: UserRole[]
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ['student'],
  },
  {
    label: 'Perfil Académico',
    to: '/perfil',
    icon: UserRound,
    roles: ['student'],
  },
  {
    label: 'Malla Curricular',
    to: '/malla',
    icon: GitBranch,
    roles: ['student', 'advisor'],
  },
  {
    label: 'Simulación',
    to: '/simulacion',
    icon: Waypoints,
    roles: ['student'],
  },
  {
    label: 'Rutas Alternativas',
    to: '/rutas',
    icon: GraduationCap,
    roles: ['student'],
  },
  {
    label: 'Comparar Escenarios',
    to: '/comparar',
    icon: SplitSquareHorizontal,
    roles: ['student'],
  },
  {
    label: 'Doble Programa',
    to: '/doble-programa',
    icon: BarChart3,
    roles: ['student'],
  },
  {
    label: 'Chat Académico',
    to: '/chat',
    icon: Bot,
    roles: ['student', 'admin'],
  },
  {
    label: 'Administración',
    to: '/admin',
    icon: ShieldCheck,
    roles: ['admin'],
  },
  {
    label: 'Cargar PDF',
    to: '/admin/cargar-pdf',
    icon: UploadCloud,
    roles: ['admin'],
  },
  {
    label: 'Asesoría',
    to: '/asesor',
    icon: UsersRound,
    roles: ['advisor'],
  },
  {
    label: 'Configuración',
    to: '/configuracion',
    icon: Settings,
    roles: ['student', 'admin', 'advisor'],
  },
]
