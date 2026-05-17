import type { Estudiante, UserRole, Usuario } from '@/types/auth'

export interface AdminOverview {
  estudiantesActivos: number
  programas: number
  totalMaterias: number
  completitudPromedio: number
}

export interface AdminActivity {
  id: string
  descripcion: string
  fecha: string
  tipo: 'materia' | 'malla' | 'dependencia' | 'estudiante'
}

export interface AdminUserItem {
  user: Usuario
  student?: Estudiante | null
}

export interface AdminUserCreatePayload {
  nombre: string
  email: string
  password: string
  rol: UserRole
  activo: boolean
  codigoEstudiantil?: string
  semestreActual?: number
  cargaMaximaCreditos?: number
  programaPrincipalId?: string
  programaSecundarioId?: string
}

export interface AdminUserUpdatePayload {
  nombre?: string
  email?: string
  rol?: UserRole
  activo?: boolean
}

export interface SystemCheck {
  id: string
  nombre: string
  estado: 'ok' | 'warning' | 'error'
  detalle: string
  accionRecomendada?: string | null
}

export interface SystemStatus {
  environment: string
  appName: string
  checks: SystemCheck[]
}
