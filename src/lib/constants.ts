import type { CourseStatus } from '@/types/curriculum'
import type { UserRole } from '@/types/auth'

export const STORAGE_KEYS = {
  auth: 'curriculapath.auth',
  mockPasswords: 'curriculapath.mock-passwords',
  users: 'curriculapath.users',
  students: 'curriculapath.students',
  programs: 'curriculapath.programs',
  enrollments: 'curriculapath.enrollments',
  versions: 'curriculapath.versions',
  courses: 'curriculapath.courses',
  dependencies: 'curriculapath.dependencies',
  histories: 'curriculapath.histories',
  scenarios: 'curriculapath.scenarios',
  scenarioEvents: 'curriculapath.scenario-events',
  scenarioResults: 'curriculapath.scenario-results',
  routes: 'curriculapath.routes',
  routeSteps: 'curriculapath.route-steps',
  documents: 'curriculapath.documents',
  extractions: 'curriculapath.extractions',
  chunks: 'curriculapath.chunks',
  chatSessions: 'curriculapath.chat-sessions',
  chatMessages: 'curriculapath.chat-messages',
  ragQueries: 'curriculapath.rag-queries',
  settings: 'curriculapath.settings',
} as const

export const STATUS_LABELS: Record<CourseStatus, string> = {
  aprobada: 'Aprobada',
  reprobada: 'Reprobada',
  en_curso: 'En curso',
  pendiente: 'Pendiente',
  disponible: 'Disponible',
  bloqueada: 'Bloqueada',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Estudiante',
  admin: 'Administrador',
  advisor: 'Asesor',
}

export const STATUS_COLORS: Record<CourseStatus, string> = {
  aprobada: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  en_curso: 'bg-sky-100 text-sky-700 border-sky-300',
  disponible: 'bg-white text-slate-700 border-slate-300',
  bloqueada: 'bg-slate-200 text-slate-600 border-slate-300',
  reprobada: 'bg-rose-100 text-rose-700 border-rose-300',
  pendiente: 'bg-amber-100 text-amber-700 border-amber-300',
}
