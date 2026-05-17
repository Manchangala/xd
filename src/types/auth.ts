export type UserRole = 'student' | 'admin' | 'advisor'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: UserRole
  activo: boolean
  creadoEn: string
}

export interface Estudiante {
  id: string
  usuarioId: string
  codigoEstudiantil: string
  semestreActual: number
  cargaMaximaCreditos: number
  creadoEn: string
}

export interface AuthSession {
  user: Usuario
  studentId?: string
  accessToken?: string
  tokenType?: 'bearer'
}

export interface RegisterPayload {
  nombre: string
  email: string
  password: string
  codigoEstudiantil: string
  semestreActual: number
  cargaMaximaCreditos: number
  programaPrincipalId: string
  programaSecundarioId?: string
}

export interface PasswordRecoveryRequestResult {
  message: string
  demoCode: string
}
