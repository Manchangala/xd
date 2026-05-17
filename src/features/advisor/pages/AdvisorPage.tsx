import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CurriculumGraph } from '@/components/graph/CurriculumGraph'
import { GraphLegend } from '@/components/graph/GraphLegend'
import { AccessDenied } from '@/components/ui/access'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page'
import { useAuthStore } from '@/features/auth/store/authStore'
import { curriculumService } from '@/features/curriculum/services/curriculumService'
import { scenarioService } from '@/features/scenarios/services/scenarioService'
import { normalizeSearchText } from '@/lib/utils'

export function AdvisorPage() {
  const role = useAuthStore((state) => state.session?.user.rol)
  const [search, setSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('student_1')

  const directory = useQuery({
    queryKey: ['advisor-directory'],
    queryFn: curriculumService.getStudentDirectory,
  })
  const studentRows = useMemo(() => directory.data ?? [], [directory.data])
  const normalizedSearch = normalizeSearchText(search)
  const filteredStudents = useMemo(
    () =>
      studentRows.filter(({ student, user }) => {
        const normalizedName = normalizeSearchText(user.nombre)
        const normalizedCode = normalizeSearchText(student.codigoEstudiantil)
        return (
          !normalizedSearch ||
          normalizedName.includes(normalizedSearch) ||
          normalizedCode.includes(normalizedSearch)
        )
      }),
    [normalizedSearch, studentRows],
  )
  const effectiveSelectedStudentId =
    filteredStudents.length > 0 &&
    !filteredStudents.some(({ student }) => student.id === selectedStudentId)
      ? filteredStudents[0].student.id
      : selectedStudentId
  const selectedRow =
    studentRows.find(({ student }) => student.id === effectiveSelectedStudentId) ??
    studentRows[0]
  const student = selectedRow?.student
  const primaryProgram = useQuery({
    queryKey: ['advisor-primary-program', student?.id],
    queryFn: () => curriculumService.getPrimaryProgramId(student!.id),
    enabled: Boolean(student),
  })

  const summary = useQuery({
    queryKey: ['advisor-summary', student?.id, primaryProgram.data],
    queryFn: () =>
      curriculumService.getProgressSummary(student!.id, primaryProgram.data!),
    enabled: Boolean(student && primaryProgram.data),
  })
  const scenarios = useQuery({
    queryKey: ['advisor-scenarios', student?.id],
    queryFn: () => scenarioService.getScenarios(student!.id),
    enabled: Boolean(student),
  })
  const graph = useQuery({
    queryKey: ['advisor-graph', student?.id, primaryProgram.data],
    queryFn: () =>
      curriculumService.getCurriculumGraph(primaryProgram.data!, student!.id),
    enabled: Boolean(student && primaryProgram.data),
  })

  if (role !== 'advisor') return <AccessDenied role="asesor" />
  if (
    directory.isLoading ||
    primaryProgram.isLoading ||
    summary.isLoading ||
    scenarios.isLoading ||
    graph.isLoading
  ) {
    return <LoadingBlock />
  }
  if (
    directory.isError ||
    primaryProgram.isError ||
    summary.isError ||
    scenarios.isError ||
    graph.isError ||
    !summary.data ||
    !graph.data
  ) {
    return <ErrorState message="No se pudo cargar la vista de asesoría." />
  }
  if (!studentRows.length || !selectedRow || !student) {
    return (
      <EmptyState
        title="Sin estudiantes"
        description="Todavía no hay estudiantes registrados para asesorar."
      />
    )
  }

  const user = selectedRow.user
  const approved = graph.data.materias.filter((course) => course.estado === 'aprobada').length
  const inProgress = graph.data.materias.filter((course) => course.estado === 'en_curso').length
  const blocked = graph.data.materias.filter((course) => course.estado === 'bloqueada').length

  return (
    <>
      <PageHeader
        eyebrow="Asesoría"
        title="Panel del asesor académico"
        description="Vista solo lectura para apoyar conversaciones y revisar escenarios guardados."
      />
      <Card>
        <label className="mb-2 block text-sm font-medium">Buscar estudiante</label>
        <Input
          placeholder="Nombre o código estudiantil"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filteredStudents.map(({ student: rowStudent, user: rowUser }) => (
            <button
              key={rowStudent.id}
              onClick={() => setSelectedStudentId(rowStudent.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                rowStudent.id === student.id
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-slate-200 hover:border-brand-200 dark:border-slate-800'
              }`}
            >
              <p className="font-semibold">{rowUser.nombre}</p>
              <p className="mt-1 text-sm text-slate-500">{rowStudent.codigoEstudiantil}</p>
            </button>
          ))}
        </div>
        {!filteredStudents.length ? (
          <div className="mt-4">
            <EmptyState
              title="Sin coincidencias"
              description="Prueba con otro nombre o código estudiantil."
            />
          </div>
        ) : null}
      </Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <h3 className="text-lg font-semibold">{user.nombre}</h3>
          <p className="mt-2 text-sm text-slate-500">{student.codigoEstudiantil}</p>
          <p className="mt-5 text-3xl font-bold">
            {Math.round(summary.data.porcentajeAvance)}%
          </p>
          <p className="text-sm text-slate-500">avance en programa principal</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{approved} aprobadas</Badge>
            <Badge>{inProgress} en curso</Badge>
            <Badge>{blocked} bloqueadas</Badge>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Simulaciones guardadas</h3>
          <div className="mt-4 space-y-3">
            {scenarios.data?.map((scenario) => (
              <div
                key={scenario.escenario.id}
                className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"
              >
                <p className="font-medium">{scenario.escenario.nombre}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {scenario.resumen.materiasBloqueadas} bloqueadas · grad. sem.{' '}
                  {scenario.resumen.semestreEstimadoGraduacion}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Notas para la asesoría</h3>
          <div className="mt-4 space-y-3 text-sm">
            <p>• Recomendar revisar la cadena INF102 → INF201 → INF202.</p>
            <p>
              • Próximo semestre hay {summary.data.disponiblesProximoSemestre.length}{' '}
              materias disponibles.
            </p>
            <p>
              • Graduación estimada actual: semestre {summary.data.semestreEstimadoGraduacion}.
            </p>
          </div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <Card>
          <h3 className="text-lg font-semibold">Próximo semestre</h3>
          <div className="mt-4 space-y-3">
            {summary.data.disponiblesProximoSemestre.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"
              >
                <p className="font-medium">{course.nombre}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {course.codigo} · {course.creditos} créditos
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Malla del estudiante (solo lectura)</h3>
          <div className="mt-4 space-y-4">
            <GraphLegend />
            <CurriculumGraph
              courses={graph.data.materias}
              dependencies={graph.data.dependencias}
            />
          </div>
        </Card>
      </div>
    </>
  )
}
