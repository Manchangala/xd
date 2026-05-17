import { mockAdapter } from '@/lib/api/mockAdapter'
import { apiClient } from '@/lib/api/apiClient'
import { endpoints } from '@/lib/api/endpoints'
import {
  isApiNetworkError,
  shouldUseApi,
  switchToMockDataSource,
} from '@/lib/api/config'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage/localStorage'
import { uid } from '@/lib/utils'
import {
  buildCoursesWithState,
  calcularProgreso,
  materiasDisponibles,
} from '@/features/curriculum/utils/curriculumUtils'
import type {
  CourseStatus,
  CurriculumGraphPayload,
  DependenciaMateria,
  DoubleProgramOverview,
  HistorialAcademico,
  InscripcionPrograma,
  Materia,
  Programa,
  ProgressSummary,
  VersionMalla,
} from '@/types/curriculum'
import { estudiantesMock, usuariosMock } from '@/mocks/users.mock'
import type { Estudiante, Usuario } from '@/types/auth'

const getPrograms = () => readStorage<Programa[]>(STORAGE_KEYS.programs, [])
const getVersions = () => readStorage<VersionMalla[]>(STORAGE_KEYS.versions, [])
const getCourses = () => readStorage<Materia[]>(STORAGE_KEYS.courses, [])
const getDependencies = () =>
  readStorage<DependenciaMateria[]>(STORAGE_KEYS.dependencies, [])
const getHistories = () => readStorage<HistorialAcademico[]>(STORAGE_KEYS.histories, [])
const getEnrollments = () =>
  readStorage<InscripcionPrograma[]>(STORAGE_KEYS.enrollments, [])
const getStudents = () => readStorage<Estudiante[]>(STORAGE_KEYS.students, estudiantesMock)
const getUsers = () => readStorage<Usuario[]>(STORAGE_KEYS.users, usuariosMock)

const getActiveVersion = (programId: string) =>
  getVersions().find((item) => item.programaId === programId && item.activa)

const getProgramCourses = (programId: string) => {
  const version = getActiveVersion(programId)
  if (!version) return { version: undefined, courses: [] as Materia[] }
  return {
    version,
    courses: getCourses().filter((course) => course.versionMallaId === version.id),
  }
}

const estimateRemainingSemesters = (
  courses: Materia[],
  dependencies: DependenciaMateria[],
  history: HistorialAcademico[],
  maxCredits: number,
  totalProgramCredits: number,
) => {
  const initialSatisfied = new Set(
    history
      .filter((item) => item.estado === 'aprobada' || item.estado === 'en_curso')
      .map((item) => item.materiaId),
  )
  const satisfied = new Set(initialSatisfied)
  const remaining = new Set(courses.filter((course) => !satisfied.has(course.id)).map((course) => course.id))
  const courseById = new Map(courses.map((course) => [course.id, course]))
  const prereqByCourse = new Map<string, string[]>()
  const dependentsCount = new Map<string, number>()

  for (const course of courses) {
    prereqByCourse.set(course.id, [])
    dependentsCount.set(course.id, 0)
  }

  dependencies
    .filter((dependency) => dependency.tipo === 'prerequisito')
    .forEach((dependency) => {
      prereqByCourse.get(dependency.materiaId)?.push(dependency.materiaRequeridaId)
      dependentsCount.set(
        dependency.materiaRequeridaId,
        (dependentsCount.get(dependency.materiaRequeridaId) ?? 0) + 1,
      )
    })

  let semesters = 0
  while (remaining.size > 0) {
    const available = [...remaining]
      .map((courseId) => courseById.get(courseId))
      .filter((course): course is Materia => Boolean(course))
      .filter((course) =>
        (prereqByCourse.get(course.id) ?? []).every((prereqId) => satisfied.has(prereqId)),
      )
      .sort((a, b) =>
        a.semestreSugerido - b.semestreSugerido ||
        (dependentsCount.get(b.id) ?? 0) - (dependentsCount.get(a.id) ?? 0) ||
        a.codigo.localeCompare(b.codigo),
      )

    if (available.length === 0) return semesters + remaining.size

    let usedCredits = 0
    const selected: Materia[] = []
    for (const course of available) {
      if (usedCredits + course.creditos <= maxCredits || selected.length === 0) {
        selected.push(course)
        usedCredits += course.creditos
      }
    }

    selected.forEach((course) => {
      satisfied.add(course.id)
      remaining.delete(course.id)
    })
    semesters += 1
  }

  const approvedCredits = courses
    .filter((course) => initialSatisfied.has(course.id))
    .reduce((total, course) => total + course.creditos, 0)
  const remainingCreditsByProgram = Math.max(totalProgramCredits - approvedCredits, 0)
  const remainingCreditsByCatalog = courses
    .filter((course) => !initialSatisfied.has(course.id))
    .reduce((total, course) => total + course.creditos, 0)
  const safeMaxCredits = Math.max(maxCredits, 1)
  const semestersByCreditLoad = Math.ceil(
    Math.max(remainingCreditsByProgram, remainingCreditsByCatalog) / safeMaxCredits,
  )

  return Math.max(semesters, semestersByCreditLoad)
}

const buildProgressBySemester = (
  student: Estudiante | undefined,
  courses: Materia[],
  history: HistorialAcademico[],
) => {
  const courseById = new Map(courses.map((course) => [course.id, course]))
  const approvedBySemester = new Map<number, number>()

  history
    .filter((item) => item.estado === 'aprobada')
    .forEach((item) => {
      const course = courseById.get(item.materiaId)
      if (!course) return
      const semester = item.semestreCursado ?? course.semestreSugerido
      approvedBySemester.set(
        semester,
        (approvedBySemester.get(semester) ?? 0) + course.creditos,
      )
    })

  const lastSemester = Math.max(
    student?.semestreActual ?? 1,
    ...approvedBySemester.keys(),
    1,
  )

  return Array.from({ length: lastSemester }, (_, index) => {
    const semester = index + 1
    return {
      semestre: `S${semester}`,
      aprobados: approvedBySemester.get(semester) ?? 0,
    }
  })
}

const calculateSummary = (
  student: Estudiante | undefined,
  program: Programa,
  courses: Materia[],
  dependencies: DependenciaMateria[],
  history: HistorialAcademico[],
): ProgressSummary => {
  const withState = buildCoursesWithState(courses, dependencies, history)
  const { creditosAprobados, porcentajeAvance } = calcularProgreso(
    courses,
    history,
    program.totalCreditos,
  )
  const aprobadas = withState.filter((course) => course.estado === 'aprobada').length
  const enCurso = withState.filter((course) => course.estado === 'en_curso').length
  const bloqueadas = withState.filter((course) => course.estado === 'bloqueada').length
  const disponibles = materiasDisponibles(withState)
  const cargaMaximaCreditos = student?.cargaMaximaCreditos ?? 20
  const semestresRestantesEstimados = estimateRemainingSemesters(
    courses,
    dependencies,
    history,
    cargaMaximaCreditos,
    program.totalCreditos,
  )
  const semestreEstimadoGraduacion =
    (student?.semestreActual ?? 1) + Math.max(semestresRestantesEstimados - 1, 0)

  const alertas = [
    bloqueadas > 4
      ? `${bloqueadas} materias siguen bloqueadas por prerrequisitos pendientes.`
      : 'Tu cadena crítica está bajo control.',
    enCurso > 0
      ? `${enCurso} materia(s) en curso pueden desbloquear nuevas rutas al cierre del semestre.`
      : 'No registras materias en curso actualmente.',
  ]

  return {
    totalCreditos: program.totalCreditos,
    creditosAprobados,
    porcentajeAvance,
    promedioAcumulado: creditosAprobados > 0 ? 4.12 : null,
    aprobadas,
    enCurso,
    bloqueadas,
    semestreEstimadoGraduacion,
    semestresRestantesEstimados,
    cargaMaximaCreditos,
    disponiblesProximoSemestre: disponibles.slice(0, 6),
    avancePorSemestre: buildProgressBySemester(student, courses, history),
    alertas,
  }
}

const buildStudentProfile = (studentId: string) => {
  const student = getStudents().find((item) => item.id === studentId)
  const user = getUsers().find((item) => item.id === student?.usuarioId)
  const enrollments = getEnrollments().filter((item) => item.estudianteId === studentId)
  const programs = getPrograms().filter((program) =>
    enrollments.some((item) => item.programaId === program.id),
  )
  return { student, user, enrollments, programs }
}

const initializeHistoriesForProgram = (studentId: string, programId: string) => {
  const { courses } = getProgramCourses(programId)
  const histories = getHistories()
  const existing = new Set(
    histories.filter((item) => item.estudianteId === studentId).map((item) => item.materiaId),
  )
  const now = new Date().toISOString()
  const missing = courses
    .filter((course) => !existing.has(course.id))
    .map<HistorialAcademico>((course) => ({
      id: uid('history'),
      estudianteId: studentId,
      materiaId: course.id,
      estado: 'pendiente',
      actualizadoEn: now,
    }))
  if (missing.length > 0) writeStorage(STORAGE_KEYS.histories, [...histories, ...missing])
}

export const curriculumService = {
  getStudentDirectory() {
    if (shouldUseApi()) {
      return apiClient.get<Array<{ student: Estudiante; user: Usuario }>>(endpoints.students)
    }
    return mockAdapter(() =>
      getStudents().map((student) => ({
        student,
        user: getUsers().find((item) => item.id === student.usuarioId)!,
      })),
    )
  },

  getPrograms() {
    if (shouldUseApi()) {
      return apiClient.get<Programa[]>(endpoints.programs).catch((error) => {
        if (!isApiNetworkError(error)) throw error
        switchToMockDataSource()
        return getPrograms()
      })
    }
    return mockAdapter(() => getPrograms())
  },

  getStudentProfile(
    studentId: string,
  ): Promise<{
    student?: Estudiante
    user?: Usuario
    enrollments: InscripcionPrograma[]
    programs: Programa[]
  }> {
    if (shouldUseApi()) {
      return apiClient.get<{
        student?: Estudiante
        user?: Usuario
        enrollments: InscripcionPrograma[]
        programs: Programa[]
      }>(endpoints.profile(studentId))
    }
    return mockAdapter(() => buildStudentProfile(studentId))
  },

  async getPrimaryProgramId(studentId: string) {
    const profile = await curriculumService.getStudentProfile(studentId)
    const primaryEnrollment =
      profile.enrollments.find((item) => item.esPrincipal) ?? profile.enrollments[0]
    if (!primaryEnrollment) throw new Error('Programa principal no encontrado')
    return primaryEnrollment.programaId
  },

  getCurriculumGraph(programId: string, studentId: string) {
    if (shouldUseApi()) {
      return apiClient.get<CurriculumGraphPayload>(`${endpoints.graph(programId)}?student_id=${studentId}`)
    }
    return mockAdapter<CurriculumGraphPayload>(() => {
      const programa = getPrograms().find((item) => item.id === programId)
      const { version, courses: materias } = getProgramCourses(programId)
      if (!programa || !version) throw new Error('No se encontró una malla activa')
      const ids = new Set(materias.map((course) => course.id))
      const dependencias = getDependencies().filter(
        (dependency) => ids.has(dependency.materiaId) && ids.has(dependency.materiaRequeridaId),
      )
      const historial = getHistories().filter(
        (item) => item.estudianteId === studentId && ids.has(item.materiaId),
      )

      return {
        programa,
        version,
        materias: buildCoursesWithState(materias, dependencias, historial),
        dependencias,
      }
    })
  },

  getProgressSummary(studentId: string, programId: string) {
    if (shouldUseApi()) {
      return apiClient.get<ProgressSummary>(endpoints.progress(studentId, programId))
    }
    return mockAdapter(() => {
      const student = getStudents().find((item) => item.id === studentId)
      const program = getPrograms().find((item) => item.id === programId)
      const { version, courses } = getProgramCourses(programId)
      if (!program || !version) throw new Error('Programa no encontrado')
      const ids = new Set(courses.map((course) => course.id))
      const dependencies = getDependencies().filter(
        (dependency) => ids.has(dependency.materiaId) && ids.has(dependency.materiaRequeridaId),
      )
      const history = getHistories().filter(
        (item) => item.estudianteId === studentId && ids.has(item.materiaId),
      )
      return calculateSummary(student, program, courses, dependencies, history)
    })
  },

  getAvailableNextSemester(studentId: string, programId: string) {
    return curriculumService.getCurriculumGraph(programId, studentId).then((graph) => materiasDisponibles(graph.materias))
  },

  updateHistoryStatus(studentId: string, materiaId: string, estado: CourseStatus) {
    if (shouldUseApi()) {
      return apiClient.patch<{ estado: CourseStatus }, HistorialAcademico>(
        `${endpoints.history(studentId)}/${materiaId}`,
        { estado },
      )
    }
    return mockAdapter(() => {
      const histories = getHistories()
      const index = histories.findIndex(
        (item) => item.estudianteId === studentId && item.materiaId === materiaId,
      )
      if (index === -1) throw new Error('Registro de historial no encontrado')
      histories[index] = {
        ...histories[index],
        estado,
        actualizadoEn: new Date().toISOString(),
      }
      writeStorage(STORAGE_KEYS.histories, histories)
      return histories[index]
    })
  },

  updateStudentProfile(
    studentId: string,
    payload: { semestreActual?: number; cargaMaximaCreditos?: number },
  ) {
    if (shouldUseApi()) {
      return apiClient.patch<typeof payload, Estudiante>(endpoints.student(studentId), payload)
    }
    return mockAdapter(() => {
      const students = getStudents()
      const student = students.find((item) => item.id === studentId)
      if (!student) throw new Error('Estudiante no encontrado')
      const next = students.map((item) =>
        item.id === studentId ? { ...item, ...payload } : item,
      )
      writeStorage(STORAGE_KEYS.students, next)
      return next.find((item) => item.id === studentId)
    })
  },

  updateStudentSemester(studentId: string, semestreActual: number) {
    return curriculumService.updateStudentProfile(studentId, { semestreActual })
  },

  updateStudentPrograms(
    studentId: string,
    payload: { programaPrincipalId: string; programaSecundarioId?: string },
  ) {
    if (shouldUseApi()) {
      return apiClient.patch<typeof payload, ReturnType<typeof buildStudentProfile>>(
        endpoints.studentPrograms(studentId),
        payload,
      )
    }

    return mockAdapter(() => {
      if (payload.programaSecundarioId && payload.programaSecundarioId === payload.programaPrincipalId) {
        throw new Error('El programa principal y el secundario deben ser distintos')
      }
      const selected = [
        payload.programaPrincipalId,
        ...(payload.programaSecundarioId ? [payload.programaSecundarioId] : []),
      ]
      const programs = getPrograms()
      const invalid = selected.some((programId) => !programs.find((program) => program.id === programId && program.activo))
      if (invalid) throw new Error('Solo puedes seleccionar programas activos')

      const enrollments = getEnrollments()
      const kept = enrollments.filter((item) => item.estudianteId !== studentId)
      const existingByProgram = new Map(
        enrollments
          .filter((item) => item.estudianteId === studentId)
          .map((item) => [item.programaId, item]),
      )
      const now = new Date().toISOString()
      const nextSelected = selected.map<InscripcionPrograma>((programId) => ({
        ...(existingByProgram.get(programId) ?? {
          id: uid('enroll'),
          estudianteId: studentId,
          programaId: programId,
          fechaInscripcion: now,
        }),
        esPrincipal: programId === payload.programaPrincipalId,
      }))
      writeStorage(STORAGE_KEYS.enrollments, [...kept, ...nextSelected])
      selected.forEach((programId) => initializeHistoriesForProgram(studentId, programId))
      return buildStudentProfile(studentId)
    })
  },

  getDoubleProgramOverview(studentId: string) {
    if (shouldUseApi()) {
      return apiClient.get<DoubleProgramOverview>(endpoints.doubleProgram(studentId))
    }
    return mockAdapter<DoubleProgramOverview>(() => {
      const student = getStudents().find((item) => item.id === studentId)
      const enrollments = getEnrollments().filter((item) => item.estudianteId === studentId)
      const principalEnrollment = enrollments.find((item) => item.esPrincipal)
      if (!principalEnrollment) throw new Error('Programa principal no encontrado')
      const secondaryEnrollment = enrollments.find((item) => !item.esPrincipal)
      const principalProgram = getPrograms().find((item) => item.id === principalEnrollment.programaId)
      if (!principalProgram) throw new Error('Programa principal no encontrado')

      const makeSummary = (program: Programa) => {
        const { version, courses } = getProgramCourses(program.id)
        if (!version) throw new Error('Versión activa no encontrada')
        const ids = new Set(courses.map((course) => course.id))
        const dependencies = getDependencies().filter(
          (dependency) => ids.has(dependency.materiaId) && ids.has(dependency.materiaRequeridaId),
        )
        const history = getHistories().filter(
          (item) => item.estudianteId === studentId && ids.has(item.materiaId),
        )
        return calculateSummary(student, program, courses, dependencies, history)
      }

      const secondaryProgram = secondaryEnrollment
        ? getPrograms().find((item) => item.id === secondaryEnrollment.programaId)
        : undefined

      const { version: principalVersion } = getProgramCourses(principalProgram.id)
      const { version: secondaryVersion } = secondaryProgram
        ? getProgramCourses(secondaryProgram.id)
        : { version: undefined }
      const principalCodes = new Set(
        getCourses()
          .filter((course) => course.versionMallaId === principalVersion?.id)
          .map((course) => course.codigo),
      )
      const shared = secondaryVersion
        ? getCourses()
            .filter((course) => course.versionMallaId === secondaryVersion.id)
            .filter((course) => principalCodes.has(course.codigo))
            .map((course) => course.codigo)
        : []

      return {
        principal: {
          programa: principalProgram,
          progreso: makeSummary(principalProgram),
        },
        secundario: secondaryProgram
          ? {
              programa: secondaryProgram,
              progreso: makeSummary(secondaryProgram),
            }
          : undefined,
        materiasCompartidas: shared,
      }
    })
  },
}
