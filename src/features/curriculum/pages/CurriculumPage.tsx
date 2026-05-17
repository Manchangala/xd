import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page'
import { useToast } from '@/components/ui/useToast'
import { CurriculumGraph } from '@/components/graph/CurriculumGraph'
import { GraphLegend } from '@/components/graph/GraphLegend'
import { GraphToolbar } from '@/components/graph/GraphToolbar'
import { curriculumService } from '@/features/curriculum/services/curriculumService'
import { usePrimaryProgramId } from '@/features/curriculum/hooks/usePrimaryProgramId'
import { useAuthStore } from '@/features/auth/store/authStore'
import { normalizeSearchText } from '@/lib/utils'
import type { CourseStatus } from '@/types/curriculum'

export function CurriculumPage() {
  const studentId = useAuthStore((state) => state.session?.studentId) ?? 'student_1'
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const [selectedId, setSelectedId] = useState<string>()
  const [search, setSearch] = useState('')
  const [semester, setSemester] = useState('all')
  const [status, setStatus] = useState('all')
  const [showDependents, setShowDependents] = useState(false)
  const primaryProgram = usePrimaryProgramId(studentId)

  const graph = useQuery({
    queryKey: ['graph', studentId, primaryProgram.data],
    queryFn: () => curriculumService.getCurriculumGraph(primaryProgram.data!, studentId),
    enabled: Boolean(primaryProgram.data),
  })
  const updateStatus = useMutation({
    mutationFn: ({
      materiaId,
      estado,
    }: {
      materiaId: string
      estado: CourseStatus
    }) => curriculumService.updateHistoryStatus(studentId, materiaId, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      pushToast({ title: 'Estado de materia actualizado' })
    },
  })

  const filteredCourses = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search)
    return (
      graph.data?.materias.filter((course) => {
        const matchesSearch =
          !normalizedSearch ||
          normalizeSearchText(course.codigo).includes(normalizedSearch) ||
          normalizeSearchText(course.nombre).includes(normalizedSearch)
        const matchesSemester =
          semester === 'all' || course.semestreSugerido === Number(semester)
        const matchesStatus = status === 'all' || course.estado === status
        return matchesSearch && matchesSemester && matchesStatus
      }) ?? []
    )
  }, [graph.data?.materias, search, semester, status])

  if (primaryProgram.isLoading || graph.isLoading) return <LoadingBlock />
  if (primaryProgram.isError || graph.isError || !graph.data) {
    return <ErrorState message="No se pudo cargar la malla curricular." />
  }

  const selected =
    filteredCourses.find((course) => course.id === selectedId) ??
    filteredCourses[0]

  return (
    <>
      <PageHeader
        eyebrow="Malla"
        title="Malla curricular interactiva"
        description="Grafo navegable con estados, filtros, dependencias y acciones conectadas a servicios desacoplados."
      />
      <div className="space-y-4">
        <GraphToolbar
          search={search}
          semester={semester}
          status={status}
          onSearchChange={setSearch}
          onSemesterChange={setSemester}
          onStatusChange={setStatus}
        />
        <GraphLegend />
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <span>
            Mostrando {filteredCourses.length} de {graph.data.materias.length} materias
          </span>
          {(search || semester !== 'all' || status !== 'all') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('')
                setSemester('all')
                setStatus('all')
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>
      <div className="mt-5 page-grid">
        {filteredCourses.length ? (
          <CurriculumGraph
            courses={filteredCourses}
            dependencies={graph.data.dependencias}
            selectedCourseId={selected?.id}
            onSelectCourse={setSelectedId}
          />
        ) : (
          <EmptyState
            title="No hay materias que coincidan"
            description="Ajusta la búsqueda o limpia los filtros para volver a ver la malla."
          />
        )}
        {selected ? (
          <Card className="h-fit lg:sticky lg:top-24">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
              Detalle
            </p>
            <h3 className="mt-2 text-xl font-bold">{selected.nombre}</h3>
            <div className="mt-3">
              <Badge className="capitalize">{selected.estado.replace('_', ' ')}</Badge>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <div>
                  <p className="text-slate-500">Código</p>
                  <p className="mt-1 font-semibold">{selected.codigo}</p>
                </div>
                <div>
                  <p className="text-slate-500">Créditos</p>
                  <p className="mt-1 font-semibold">{selected.creditos}</p>
                </div>
                <div>
                  <p className="text-slate-500">Semestre</p>
                  <p className="mt-1 font-semibold">{selected.semestreSugerido}</p>
                </div>
                <div>
                  <p className="text-slate-500">Dependientes</p>
                  <p className="mt-1 font-semibold">{selected.dependientes.length}</p>
                </div>
              </div>
              <p>
                Prerrequisitos:{' '}
                {selected.prerequisitos.map((item) => item.codigo).join(', ') ||
                  'Sin prerrequisitos'}
              </p>
              <p>
                Correquisitos:{' '}
                {selected.correquisitos.map((item) => item.codigo).join(', ') ||
                  'Sin correquisitos'}
              </p>
            </div>
            <div className="mt-5 grid gap-2">
              <Button
                onClick={() =>
                  updateStatus.mutate({
                    materiaId: selected.id,
                    estado: 'aprobada',
                  })
                }
              >
                Marcar como aprobada
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  updateStatus.mutate({
                    materiaId: selected.id,
                    estado: 'en_curso',
                  })
                }
              >
                Marcar como en curso
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/simulacion?course=${selected.id}&type=perdida`)}
              >
                Simular pérdida
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/simulacion?course=${selected.id}&type=cancelacion`)
                }
              >
                Simular cancelación
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDependents((current) => !current)}
              >
                {showDependents ? 'Ocultar dependencias' : 'Ver dependencias'}
              </Button>
            </div>
            {showDependents ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
                <p className="font-semibold">Materias dependientes</p>
                <p className="mt-2 text-slate-500">
                  {selected.dependientes.map((item) => item.nombre).join(', ') ||
                    'No hay dependencias posteriores.'}
                </p>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </>
  )
}
