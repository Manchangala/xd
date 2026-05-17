import type {
  InscripcionPrograma,
  Programa,
  VersionMalla,
} from '@/types/curriculum'

export const programasMock: Programa[] = [
  {
    id: 'prog_systems',
    codigo: 'INGSIS',
    nombre: 'Ingeniería de Sistemas',
    totalCreditos: 162,
    activo: true,
  },
  {
    id: 'prog_business',
    codigo: 'ADMIN',
    nombre: 'Administración de Empresas',
    totalCreditos: 150,
    activo: true,
  },
]

export const versionesMock: VersionMalla[] = [
  {
    id: 'ver_sys_2025',
    programaId: 'prog_systems',
    nombreVersion: 'Plan 2025',
    anioVigencia: 2025,
    activa: true,
  },
  {
    id: 'ver_adm_2025',
    programaId: 'prog_business',
    nombreVersion: 'Plan 2025',
    anioVigencia: 2025,
    activa: true,
  },
]

export const inscripcionesMock: InscripcionPrograma[] = [
  {
    id: 'enroll_1',
    estudianteId: 'student_1',
    programaId: 'prog_systems',
    esPrincipal: true,
    fechaInscripcion: '2026-01-12T08:00:00.000Z',
  },
  {
    id: 'enroll_2',
    estudianteId: 'student_1',
    programaId: 'prog_business',
    esPrincipal: false,
    fechaInscripcion: '2026-01-12T08:00:00.000Z',
  },
  {
    id: 'enroll_3',
    estudianteId: 'student_2',
    programaId: 'prog_systems',
    esPrincipal: true,
    fechaInscripcion: '2026-02-01T08:00:00.000Z',
  },
]
