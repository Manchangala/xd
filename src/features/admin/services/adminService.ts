import { mockAdapter } from '@/lib/api/mockAdapter'
import { apiClient } from '@/lib/api/apiClient'
import { endpoints } from '@/lib/api/endpoints'
import { shouldUseApi } from '@/lib/api/config'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage/localStorage'
import { uid } from '@/lib/utils'
import type {
  AdminActivity,
  AdminOverview,
  AdminUserCreatePayload,
  AdminUserItem,
  AdminUserUpdatePayload,
  SystemStatus,
} from '@/types/admin'
import type {
  DependenciaMateria,
  HistorialAcademico,
  InscripcionPrograma,
  Materia,
  Programa,
  VersionMalla,
} from '@/types/curriculum'
import type { Estudiante, Usuario } from '@/types/auth'
import { estudiantesMock, usuariosMock } from '@/mocks/users.mock'

const activities: AdminActivity[] = [
  {
    id: 'act_1',
    descripcion: 'Nueva materia creada: Seguridad Informática',
    fecha: '2026-05-14T15:00:00.000Z',
    tipo: 'materia',
  },
  {
    id: 'act_2',
    descripcion: 'Malla 2025 de Ingeniería de Sistemas actualizada',
    fecha: '2026-05-13T12:00:00.000Z',
    tipo: 'malla',
  },
  {
    id: 'act_3',
    descripcion: 'Prerrequisito modificado: INF202 requiere INF201',
    fecha: '2026-05-12T09:30:00.000Z',
    tipo: 'dependencia',
  },
  {
    id: 'act_4',
    descripcion: 'Estudiante transferido a doble programa',
    fecha: '2026-05-11T10:45:00.000Z',
    tipo: 'estudiante',
  },
]

export const adminService = {
  getOverview() {
    if (shouldUseApi()) {
      return apiClient.get<AdminOverview>(endpoints.admin.overview)
    }
    return mockAdapter<AdminOverview>(() => ({
      estudiantesActivos: 2,
      programas: readStorage<Programa[]>(STORAGE_KEYS.programs, []).length,
      totalMaterias: readStorage<Materia[]>(STORAGE_KEYS.courses, []).length,
      completitudPromedio: 82,
    }))
  },
  getDashboardData() {
    if (shouldUseApi()) {
      return apiClient.get<{
        programas: Programa[]
        materias: Materia[]
        versiones: VersionMalla[]
        dependencias: DependenciaMateria[]
        activities: AdminActivity[]
      }>(endpoints.admin.dashboard)
    }
    return mockAdapter(() => ({
      programas: readStorage<Programa[]>(STORAGE_KEYS.programs, []),
      materias: readStorage<Materia[]>(STORAGE_KEYS.courses, []),
      versiones: readStorage<VersionMalla[]>(STORAGE_KEYS.versions, []),
      dependencias: readStorage<DependenciaMateria[]>(
        STORAGE_KEYS.dependencies,
        [],
      ),
      activities,
    }))
  },
  getSystemStatus() {
    if (shouldUseApi()) {
      return apiClient.get<SystemStatus>(endpoints.admin.systemStatus)
    }
    return mockAdapter<SystemStatus>(() => {
      const settings = readStorage<Record<string, unknown>>(STORAGE_KEYS.settings, {})
      return {
        environment: 'mock',
        appName: 'CurriculaPath API simulada',
        checks: [
          {
            id: 'api',
            nombre: 'API REST',
            estado: 'ok',
            detalle: 'Modo mock activo: servicios desacoplados responden desde localStorage.',
          },
          {
            id: 'database',
            nombre: 'Base de datos',
            estado: 'warning',
            detalle: 'Persistencia temporal en localStorage; lista para sustituirse por API real.',
            accionRecomendada: 'Usar fuente de datos API real para persistencia multiusuario.',
          },
          {
            id: 'ocr',
            nombre: 'OCR local',
            estado: 'warning',
            detalle: 'Pipeline visual disponible; OCR real se valida desde el backend.',
            accionRecomendada: 'Activar API real y revisar diagnóstico OCR.',
          },
          {
            id: 'llm',
            nombre: 'LLM local / RAG',
            estado: settings.llmConnected ? 'ok' : 'warning',
            detalle: settings.llmConnected
              ? 'Modelo local marcado como conectado en configuración.'
              : 'Chat/RAG opera con respuestas mock fundamentadas.',
            accionRecomendada: settings.llmConnected
              ? null
              : 'Probar conexión con Gemma, Llama o Mistral local.',
          },
          {
            id: 'security',
            nombre: 'Seguridad HTTP',
            estado: 'warning',
            detalle: 'Headers y HTTPS se aplican en la API real, no en modo mock.',
            accionRecomendada: 'Validar docs/SECURITY_AND_OPERATIONS.md para despliegue.',
          },
          {
            id: 'configuration',
            nombre: 'Configuración',
            estado: 'ok',
            detalle: 'Preferencias locales cargadas correctamente.',
          },
        ],
      }
    })
  },
  getUsers() {
    if (shouldUseApi()) {
      return apiClient.get<AdminUserItem[]>(endpoints.admin.users)
    }
    return mockAdapter<AdminUserItem[]>(() => {
      const users = readStorage<Usuario[]>(STORAGE_KEYS.users, usuariosMock)
      const students = readStorage<Estudiante[]>(STORAGE_KEYS.students, estudiantesMock)
      return users.map((user) => ({
        user,
        student: students.find((student) => student.usuarioId === user.id) ?? null,
      }))
    })
  },
  createUser(payload: AdminUserCreatePayload) {
    if (shouldUseApi()) {
      return apiClient.post<AdminUserCreatePayload, AdminUserItem>(
        endpoints.admin.users,
        payload,
      )
    }
    return mockAdapter<AdminUserItem>(() => {
      const users = readStorage<Usuario[]>(STORAGE_KEYS.users, usuariosMock)
      if (users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
        throw new Error('Ya existe un usuario con ese email')
      }
      const now = new Date().toISOString()
      const user: Usuario = {
        id: uid('user'),
        nombre: payload.nombre,
        email: payload.email,
        rol: payload.rol,
        activo: payload.activo,
        creadoEn: now,
      }
      let student: Estudiante | null = null
      writeStorage(STORAGE_KEYS.users, [...users, user])
      writeStorage(STORAGE_KEYS.mockPasswords, {
        ...readStorage<Record<string, string>>(STORAGE_KEYS.mockPasswords, {}),
        [payload.email.toLowerCase()]: payload.password,
      })

      if (payload.rol === 'student') {
        if (!payload.codigoEstudiantil || !payload.programaPrincipalId) {
          throw new Error('Los estudiantes requieren código y programa principal')
        }
        const students = readStorage<Estudiante[]>(STORAGE_KEYS.students, estudiantesMock)
        if (students.some((item) => item.codigoEstudiantil === payload.codigoEstudiantil)) {
          throw new Error('Ya existe un estudiante con ese código')
        }
        student = {
          id: uid('student'),
          usuarioId: user.id,
          codigoEstudiantil: payload.codigoEstudiantil,
          semestreActual: payload.semestreActual ?? 1,
          cargaMaximaCreditos: payload.cargaMaximaCreditos ?? 20,
          creadoEn: now,
        }
        writeStorage(STORAGE_KEYS.students, [...students, student])
        const selectedPrograms = [
          payload.programaPrincipalId,
          ...(payload.programaSecundarioId ? [payload.programaSecundarioId] : []),
        ]
        const enrollments = readStorage<InscripcionPrograma[]>(STORAGE_KEYS.enrollments, [])
        writeStorage(STORAGE_KEYS.enrollments, [
          ...enrollments,
          ...selectedPrograms.map((programId) => ({
            id: uid('enroll'),
            estudianteId: student!.id,
            programaId: programId,
            esPrincipal: programId === payload.programaPrincipalId,
            fechaInscripcion: now,
          })),
        ])
        const versions = readStorage<VersionMalla[]>(STORAGE_KEYS.versions, [])
        const courses = readStorage<Materia[]>(STORAGE_KEYS.courses, [])
        const histories = readStorage<HistorialAcademico[]>(STORAGE_KEYS.histories, [])
        const newHistories = selectedPrograms.flatMap((programId) => {
          const version = versions.find((item) => item.programaId === programId && item.activa)
          return courses
            .filter((course) => course.versionMallaId === version?.id)
            .map<HistorialAcademico>((course) => ({
              id: uid('history'),
              estudianteId: student!.id,
              materiaId: course.id,
              estado: 'pendiente',
              actualizadoEn: now,
            }))
        })
        writeStorage(STORAGE_KEYS.histories, [...histories, ...newHistories])
      }

      return { user, student }
    })
  },
  updateUser(userId: string, payload: AdminUserUpdatePayload) {
    if (shouldUseApi()) {
      return apiClient.patch<AdminUserUpdatePayload, AdminUserItem>(
        `${endpoints.admin.users}/${userId}`,
        payload,
      )
    }
    return mockAdapter<AdminUserItem>(() => {
      const users = readStorage<Usuario[]>(STORAGE_KEYS.users, usuariosMock)
      const next = users.map((user) => (user.id === userId ? { ...user, ...payload } : user))
      writeStorage(STORAGE_KEYS.users, next)
      const user = next.find((item) => item.id === userId)
      if (!user) throw new Error('Usuario no encontrado')
      const student =
        readStorage<Estudiante[]>(STORAGE_KEYS.students, estudiantesMock).find(
          (item) => item.usuarioId === user.id,
        ) ?? null
      return { user, student }
    })
  },
  resetUserPassword(userId: string, newPassword: string) {
    if (shouldUseApi()) {
      return apiClient.post<{ newPassword: string }, { ok: boolean }>(
        endpoints.admin.resetUserPassword(userId),
        { newPassword },
      )
    }
    return mockAdapter(() => {
      const user = readStorage<Usuario[]>(STORAGE_KEYS.users, usuariosMock).find(
        (item) => item.id === userId,
      )
      if (!user) throw new Error('Usuario no encontrado')
      writeStorage(STORAGE_KEYS.mockPasswords, {
        ...readStorage<Record<string, string>>(STORAGE_KEYS.mockPasswords, {}),
        [user.email.toLowerCase()]: newPassword,
      })
      return { ok: true }
    })
  },
  createProgram(payload: Omit<Programa, 'id'>) {
    if (shouldUseApi()) {
      return apiClient.post<Omit<Programa, 'id'>, Programa>(
        endpoints.programs,
        payload,
      )
    }
    return mockAdapter(() => {
      const programs = readStorage<Programa[]>(STORAGE_KEYS.programs, [])
      const program: Programa = { ...payload, id: uid('program') }
      writeStorage(STORAGE_KEYS.programs, [...programs, program])
      return program
    })
  },
  updateProgram(programId: string, payload: Partial<Omit<Programa, 'id'>>) {
    if (shouldUseApi()) {
      return apiClient.patch<Partial<Omit<Programa, 'id'>>, Programa>(
        `${endpoints.programs}/${programId}`,
        payload,
      )
    }
    return mockAdapter(() => {
      const programs = readStorage<Programa[]>(STORAGE_KEYS.programs, [])
      const next = programs.map((program) =>
        program.id === programId ? { ...program, ...payload } : program,
      )
      writeStorage(STORAGE_KEYS.programs, next)
      return next.find((item) => item.id === programId)
    })
  },
  toggleProgram(programId: string) {
    if (shouldUseApi()) {
      return adminService.getDashboardData().then((dashboard) => {
        const program = dashboard.programas.find((item) => item.id === programId)
        if (!program) throw new Error('Programa no encontrado')
        return adminService.updateProgram(programId, { activo: !program.activo })
      })
    }
    return mockAdapter(() => {
      const programs = readStorage<Programa[]>(STORAGE_KEYS.programs, [])
      const next = programs.map((program) =>
        program.id === programId ? { ...program, activo: !program.activo } : program,
      )
      writeStorage(STORAGE_KEYS.programs, next)
      return next.find((item) => item.id === programId)
    })
  },
  createCourse(payload: Omit<Materia, 'id'>) {
    if (shouldUseApi()) {
      return apiClient.post<Omit<Materia, 'id'>, Materia>(
        endpoints.courses,
        payload,
      )
    }
    return mockAdapter(() => {
      const courses = readStorage<Materia[]>(STORAGE_KEYS.courses, [])
      const course: Materia = { ...payload, id: uid('course') }
      writeStorage(STORAGE_KEYS.courses, [...courses, course])
      return course
    })
  },
  updateCourse(courseId: string, payload: Partial<Omit<Materia, 'id'>>) {
    if (shouldUseApi()) {
      return apiClient.patch<Partial<Omit<Materia, 'id'>>, Materia>(
        `${endpoints.courses}/${courseId}`,
        payload,
      )
    }
    return mockAdapter(() => {
      const courses = readStorage<Materia[]>(STORAGE_KEYS.courses, [])
      const next = courses.map((course) =>
        course.id === courseId ? { ...course, ...payload } : course,
      )
      writeStorage(STORAGE_KEYS.courses, next)
      return next.find((item) => item.id === courseId)
    })
  },
  createVersion(payload: Omit<VersionMalla, 'id'>) {
    if (shouldUseApi()) {
      return apiClient.post<Omit<VersionMalla, 'id'>, VersionMalla>(
        endpoints.admin.versions,
        payload,
      )
    }
    return mockAdapter(() => {
      const versions = readStorage<VersionMalla[]>(STORAGE_KEYS.versions, [])
      const version: VersionMalla = { ...payload, id: uid('version') }
      const next = payload.activa
        ? [
            ...versions.map((item) =>
              item.programaId === payload.programaId
                ? { ...item, activa: false }
                : item,
            ),
            version,
          ]
        : [...versions, version]
      writeStorage(STORAGE_KEYS.versions, next)
      return version
    })
  },
  updateVersion(
    versionId: string,
    payload: Partial<Omit<VersionMalla, 'id'>>,
  ) {
    if (shouldUseApi()) {
      return apiClient.patch<
        Partial<Omit<VersionMalla, 'id'>>,
        VersionMalla
      >(`${endpoints.admin.versions}/${versionId}`, payload)
    }
    return mockAdapter(() => {
      const versions = readStorage<VersionMalla[]>(STORAGE_KEYS.versions, [])
      const current = versions.find((item) => item.id === versionId)
      if (!current) throw new Error('Versión no encontrada')
      const next = versions.map((version) =>
        version.id === versionId ? { ...version, ...payload } : version,
      )
      writeStorage(STORAGE_KEYS.versions, next)
      return next.find((item) => item.id === versionId)
    })
  },
  toggleVersion(versionId: string) {
    if (shouldUseApi()) {
      return apiClient.post<Record<string, never>, VersionMalla>(
        `${endpoints.admin.versions}/${versionId}/toggle`,
        {},
      )
    }
    return mockAdapter(() => {
      const versions = readStorage<VersionMalla[]>(STORAGE_KEYS.versions, [])
      const target = versions.find((version) => version.id === versionId)
      if (!target) throw new Error('Versión no encontrada')
      const activeSiblings = versions.filter(
        (version) =>
          version.programaId === target.programaId && version.activa,
      )
      if (target.activa && activeSiblings.length <= 1) {
        throw new Error('Debe existir al menos una versión activa por programa')
      }
      const next = versions.map((version) => {
        if (version.programaId !== target.programaId) return version
        if (version.id === versionId) {
          return { ...version, activa: !version.activa }
        }
        return target.activa ? version : { ...version, activa: false }
      })
      writeStorage(STORAGE_KEYS.versions, next)
      return next.find((item) => item.id === versionId)
    })
  },
  createDependency(payload: Omit<DependenciaMateria, 'id'>) {
    if (shouldUseApi()) {
      return apiClient.post<Omit<DependenciaMateria, 'id'>, DependenciaMateria>(
        endpoints.admin.dependencies,
        payload,
      )
    }
    return mockAdapter(() => {
      const dependencies = readStorage<DependenciaMateria[]>(
        STORAGE_KEYS.dependencies,
        [],
      )
      const duplicated = dependencies.some(
        (dependency) =>
          dependency.materiaId === payload.materiaId &&
          dependency.materiaRequeridaId === payload.materiaRequeridaId &&
          dependency.tipo === payload.tipo,
      )
      if (duplicated) {
        throw new Error('La dependencia ya existe')
      }
      const dependency: DependenciaMateria = { ...payload, id: uid('dependency') }
      writeStorage(STORAGE_KEYS.dependencies, [...dependencies, dependency])
      return dependency
    })
  },
  deleteDependency(dependencyId: string) {
    if (shouldUseApi()) {
      return apiClient.delete<{ dependencyId: string; deleted: boolean }>(
        `${endpoints.admin.dependencies}/${dependencyId}`,
      )
    }
    return mockAdapter(() => {
      const dependencies = readStorage<DependenciaMateria[]>(
        STORAGE_KEYS.dependencies,
        [],
      )
      const next = dependencies.filter((dependency) => dependency.id !== dependencyId)
      writeStorage(STORAGE_KEYS.dependencies, next)
      return { dependencyId, deleted: true }
    })
  },
}
