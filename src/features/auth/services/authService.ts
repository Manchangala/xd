import { mockAdapter } from '@/lib/api/mockAdapter'
import { apiClient } from '@/lib/api/apiClient'
import { endpoints } from '@/lib/api/endpoints'
import {
  isApiNetworkError,
  shouldUseApi,
  switchToMockDataSource,
} from '@/lib/api/config'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, removeStorage, writeStorage } from '@/lib/storage/localStorage'
import { uid } from '@/lib/utils'
import { estudiantesMock, usuariosMock } from '@/mocks/users.mock'
import type {
  AuthSession,
  PasswordRecoveryRequestResult,
  RegisterPayload,
  UserRole,
  Usuario,
} from '@/types/auth'
import type {
  HistorialAcademico,
  InscripcionPrograma,
  Materia,
  VersionMalla,
} from '@/types/curriculum'

const getUsers = () => readStorage<Usuario[]>(STORAGE_KEYS.users, usuariosMock)
const getStudents = () => readStorage(STORAGE_KEYS.students, estudiantesMock)
const getMockPasswords = () =>
  readStorage<Record<string, string>>(STORAGE_KEYS.mockPasswords, {})

const writeMockPassword = (email: string, password: string) => {
  writeStorage(STORAGE_KEYS.mockPasswords, {
    ...getMockPasswords(),
    [email.toLowerCase()]: password,
  })
}

const verifyMockPassword = (email: string, password: string) => {
  const stored = getMockPasswords()[email.toLowerCase()]
  return stored ? stored === password : password === 'demo123'
}

export const authService = {
  login(email: string, password: string, role: UserRole): Promise<AuthSession> {
    if (shouldUseApi()) {
      return apiClient
        .post<
          { email: string; password: string },
          {
            accessToken: string
            tokenType: 'bearer'
            user: AuthSession['user']
            studentId?: string
          }
        >(endpoints.auth.login, { email, password })
        .then((response) => ({
          user: response.user,
          studentId: response.studentId,
          accessToken: response.accessToken,
          tokenType: response.tokenType,
        }))
        .catch((error) => {
          if (!isApiNetworkError(error)) throw error
          switchToMockDataSource()
          return authService.login(email, password, role)
        })
    }

    return mockAdapter(() => {
      if (!verifyMockPassword(email, password)) throw new Error('Contraseña inválida')
      const users = getUsers()
      const user =
        users.find((item) => item.email === email && item.rol === role) ??
        users.find((item) => item.rol === role)
      if (!user) throw new Error('No existe un usuario mock para ese rol')
      if (!user.activo) throw new Error('El usuario está inactivo')
      const student = getStudents().find((item) => item.usuarioId === user.id)
      const session: AuthSession = {
        user,
        studentId: student?.id,
      }
      writeStorage(STORAGE_KEYS.auth, session)
      return session
    })
  },

  register(payload: RegisterPayload): Promise<AuthSession> {
    if (shouldUseApi()) {
      return apiClient
        .post<
          RegisterPayload,
          {
            accessToken: string
            tokenType: 'bearer'
            user: AuthSession['user']
            studentId?: string
          }
        >(endpoints.auth.register, payload)
        .then((response) => ({
          user: response.user,
          studentId: response.studentId,
          accessToken: response.accessToken,
          tokenType: response.tokenType,
        }))
        .catch((error) => {
          if (!isApiNetworkError(error)) throw error
          switchToMockDataSource()
          return authService.register(payload)
        })
    }

    return mockAdapter<AuthSession>(() => {
      const users = getUsers()
      if (users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
        throw new Error('Ya existe un usuario con ese email')
      }

      const students = getStudents()
      if (students.some((student) => student.codigoEstudiantil === payload.codigoEstudiantil)) {
        throw new Error('Ya existe un estudiante con ese código')
      }

      const now = new Date().toISOString()
      const user: Usuario = {
        id: uid('user'),
        nombre: payload.nombre,
        email: payload.email,
        rol: 'student',
        activo: true,
        creadoEn: now,
      }
      const student = {
        id: uid('student'),
        usuarioId: user.id,
        codigoEstudiantil: payload.codigoEstudiantil,
        semestreActual: payload.semestreActual,
        cargaMaximaCreditos: payload.cargaMaximaCreditos,
        creadoEn: now,
      }

      const selectedProgramIds = [
        payload.programaPrincipalId,
        ...(payload.programaSecundarioId ? [payload.programaSecundarioId] : []),
      ]
      const enrollments = readStorage<InscripcionPrograma[]>(STORAGE_KEYS.enrollments, [])
      const nextEnrollments: InscripcionPrograma[] = [
        ...enrollments,
        ...selectedProgramIds.map((programId) => ({
          id: uid('enroll'),
          estudianteId: student.id,
          programaId: programId,
          esPrincipal: programId === payload.programaPrincipalId,
          fechaInscripcion: now,
        })),
      ]

      const versions = readStorage<VersionMalla[]>(STORAGE_KEYS.versions, [])
      const courses = readStorage<Materia[]>(STORAGE_KEYS.courses, [])
      const currentHistories = readStorage<HistorialAcademico[]>(STORAGE_KEYS.histories, [])
      const newHistories = selectedProgramIds.flatMap((programId) => {
        const version = versions.find((item) => item.programaId === programId && item.activa)
        return courses
          .filter((course) => course.versionMallaId === version?.id)
          .map<HistorialAcademico>((course) => ({
            id: uid('history'),
            estudianteId: student.id,
            materiaId: course.id,
            estado: 'pendiente',
            actualizadoEn: now,
          }))
      })

      writeStorage(STORAGE_KEYS.users, [...users, user])
      writeStorage(STORAGE_KEYS.students, [...students, student])
      writeStorage(STORAGE_KEYS.enrollments, nextEnrollments)
      writeStorage(STORAGE_KEYS.histories, [...currentHistories, ...newHistories])
      writeMockPassword(payload.email, payload.password)

      const session: AuthSession = { user, studentId: student.id }
      writeStorage(STORAGE_KEYS.auth, session)
      return session
    })
  },

  requestPasswordRecovery(email: string): Promise<PasswordRecoveryRequestResult> {
    if (shouldUseApi()) {
      return apiClient.post<{ email: string }, PasswordRecoveryRequestResult>(
        endpoints.auth.recoveryRequest,
        { email },
      ).catch((error) => {
        if (!isApiNetworkError(error)) throw error
        switchToMockDataSource()
        return authService.requestPasswordRecovery(email)
      })
    }

    return mockAdapter<PasswordRecoveryRequestResult>(() => {
      const user = getUsers().find((item) => item.email.toLowerCase() === email.toLowerCase())
      if (!user) throw new Error('No existe un usuario con ese email')
      const demoCode = Math.random().toString(36).slice(2, 10).toUpperCase()
      writeStorage('curriculapath.recovery-code', {
        email,
        demoCode,
        expiresAt: Date.now() + 15 * 60 * 1000,
      })
      return {
        message: 'Código generado. En producción se enviaría al correo institucional.',
        demoCode,
      }
    })
  },

  confirmPasswordRecovery(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ ok: boolean }> {
    if (shouldUseApi()) {
      return apiClient.post<
        { email: string; code: string; newPassword: string },
        { ok: boolean }
      >(endpoints.auth.recoveryConfirm, { email, code, newPassword }).catch((error) => {
        if (!isApiNetworkError(error)) throw error
        switchToMockDataSource()
        return authService.confirmPasswordRecovery(email, code, newPassword)
      })
    }

    return mockAdapter(() => {
      const recovery = readStorage<{
        email: string
        demoCode: string
        expiresAt: number
      } | null>('curriculapath.recovery-code', null)
      if (
        !recovery ||
        recovery.email.toLowerCase() !== email.toLowerCase() ||
        recovery.demoCode !== code ||
        recovery.expiresAt < Date.now()
      ) {
        throw new Error('El código de recuperación no es válido o expiró')
      }
      writeMockPassword(email, newPassword)
      return { ok: true }
    })
  },

  logout() {
    if (shouldUseApi()) {
      return apiClient
        .post<Record<string, never>, { ok: boolean }>(endpoints.auth.logout, {})
        .catch(() => ({ ok: true }))
        .then(() => {
          removeStorage(STORAGE_KEYS.auth)
          return true
        })
    }

    return mockAdapter(() => {
      removeStorage(STORAGE_KEYS.auth)
      return true
    }, { delay: 120 })
  },

  getSession() {
    return mockAdapter(() => readStorage<AuthSession | null>(STORAGE_KEYS.auth, null), {
      delay: 120,
    })
  },
}
