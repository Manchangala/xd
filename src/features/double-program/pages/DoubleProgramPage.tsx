import { useQuery } from '@tanstack/react-query'
import { GitMerge, Route, Sparkles } from 'lucide-react'
import { StatCard } from '@/components/cards/StatCard'
import { CurriculumGraph } from '@/components/graph/CurriculumGraph'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page'
import { ProgressBar } from '@/components/ui/progress'
import { SectionTitle } from '@/components/ui/section'
import { curriculumService } from '@/features/curriculum/services/curriculumService'
import { useAuthStore } from '@/features/auth/store/authStore'
import { formatPercentage } from '@/lib/utils'

export function DoubleProgramPage() {
  const studentId = useAuthStore((state) => state.session?.studentId) ?? 'student_1'
  const overview = useQuery({
    queryKey: ['double-program', studentId],
    queryFn: () => curriculumService.getDoubleProgramOverview(studentId),
  })
  const primaryGraph = useQuery({
    queryKey: ['double-program-graph-primary', studentId, overview.data?.principal.programa.id],
    queryFn: () => curriculumService.getCurriculumGraph(overview.data!.principal.programa.id, studentId),
    enabled: Boolean(overview.data?.principal.programa.id),
  })
  const secondaryGraph = useQuery({
    queryKey: ['double-program-graph-secondary', studentId, overview.data?.secundario?.programa.id],
    queryFn: () => curriculumService.getCurriculumGraph(overview.data!.secundario!.programa.id, studentId),
    enabled: Boolean(overview.data?.secundario?.programa.id),
  })

  if (overview.isLoading) return <LoadingBlock />
  if (overview.isError || !overview.data) {
    return <ErrorState message="No se pudo cargar la vista de doble programa." />
  }
  if (!overview.data.secundario) {
    return (
      <EmptyState
        title="Aún no tienes doble programa"
        description="Desde Perfil Académico puedes agregar un segundo programa. Aquí verás avances independientes, materias compartidas y efectos cruzados."
      />
    )
  }

  const sharedCount = overview.data.materiasCompartidas.length

  return (
    <>
      <PageHeader
        eyebrow="Doble programa"
        title="Planeación integrada de doble titulación"
        description="Dos mallas simultáneas, avance independiente, materias compartidas y efecto transversal de una misma asignatura."
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <StatCard title="Materias compartidas" value={sharedCount} hint="Homologables entre programas" icon={GitMerge} />
        <StatCard title="Optimización estimada" value="1-2 sem." hint="Por créditos compartidos" icon={Route} />
        <StatCard title="Modalidad" value="Doble" hint="Programa principal + secundario" icon={Sparkles} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {[overview.data.principal, overview.data.secundario].map((item) => (
          <Card key={item.programa.id}>
            <p className="text-sm text-slate-500">{item.programa.codigo}</p>
            <h3 className="mt-1 text-xl font-bold">{item.programa.nombre}</h3>
            <p className="mt-4 text-4xl font-bold">{formatPercentage(item.progreso.porcentajeAvance)}</p>
            <p className="mt-2 text-sm text-slate-500">
              {item.progreso.creditosAprobados} / {item.programa.totalCreditos} créditos · graduación estimada semestre {item.progreso.semestreEstimadoGraduacion}
            </p>
            <ProgressBar value={item.progreso.porcentajeAvance} className="mt-5" />
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <SectionTitle title="Beneficios académicos" description="Por qué una vista integrada vale más que dos mallas aisladas." />
          <div className="mt-4 space-y-3 text-sm">
            <p>• Aprovechamiento de créditos compartidos y materias homologables.</p>
            <p>• Tiempo optimizado mediante rutas que respetan prerrequisitos de ambos programas.</p>
            <p>• Seguimiento visual hacia doble titulación sin duplicar esfuerzos.</p>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Materias compartidas" description={`${sharedCount} asignaturas reconocidas en ambos programas.`} />
          <div className="mt-4 flex flex-wrap gap-2">
            {overview.data.materiasCompartidas.map((code) => (
              <Badge key={code} className="border-violet-200 bg-violet-100 text-violet-700">{code}</Badge>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <GitMerge className="h-5 w-5 text-brand-700" />
              <div>
                <p className="font-semibold">Simulación visual de afectación cruzada</p>
                <p className="text-sm text-slate-500">
                  Si repruebas una materia compartida como MAT101, el sistema la resalta en ambas mallas y recalcula bloqueos para cada programa por separado.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-2">
        <Card>
          <SectionTitle title={`Malla principal · ${overview.data.principal.programa.codigo}`} description="Las materias compartidas aparecen con anillo violeta." />
          {primaryGraph.isLoading ? <LoadingBlock /> : null}
          {primaryGraph.data ? (
            <CurriculumGraph
              courses={primaryGraph.data.materias}
              dependencies={primaryGraph.data.dependencias}
              highlightedCourseCodes={overview.data.materiasCompartidas}
            />
          ) : null}
        </Card>
        <Card>
          <SectionTitle title={`Malla secundaria · ${overview.data.secundario.programa.codigo}`} description="Permite ver el impacto simultáneo del doble programa." />
          {secondaryGraph.isLoading ? <LoadingBlock /> : null}
          {secondaryGraph.data ? (
            <CurriculumGraph
              courses={secondaryGraph.data.materias}
              dependencies={secondaryGraph.data.dependencias}
              highlightedCourseCodes={overview.data.materiasCompartidas}
            />
          ) : null}
        </Card>
      </div>
    </>
  )
}
