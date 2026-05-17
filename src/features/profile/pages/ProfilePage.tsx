import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { BookOpenCheck, GraduationCap, Save, Waypoints } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { StatCard } from '@/components/cards/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page'
import { ProgressBar } from '@/components/ui/progress'
import { SectionTitle } from '@/components/ui/section'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { curriculumService } from '@/features/curriculum/services/curriculumService'
import { useAuthStore } from '@/features/auth/store/authStore'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import { formatPercentage, normalizeSearchText } from '@/lib/utils'
import type { CourseStatus } from '@/types/curriculum'

const schema = z
  .object({
    semestreActual: z.number().int().min(1).max(12),
    cargaMaximaCreditos: z.number().int().min(8).max(30),
    programaPrincipalId: z.string().min(1, 'Selecciona programa principal'),
    programaSecundarioId: z.string().optional(),
  })
  .refine(
    (value) => !value.programaSecundarioId || value.programaPrincipalId !== value.programaSecundarioId,
    {
      message: 'El segundo programa debe ser diferente al principal',
      path: ['programaSecundarioId'],
    },
  )

type FormValues = z.infer<typeof schema>

export function ProfilePage() {
  const studentId = useAuthStore((state) => state.session?.studentId) ?? 'student_1'
  const [statusFilter, setStatusFilter] = useState<'all' | CourseStatus>('all')
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()
  const { pushToast } = useToast()

  const profile = useQuery({
    queryKey: ['profile', studentId],
    queryFn: () => curriculumService.getStudentProfile(studentId),
  })
  const programs = useQuery({
    queryKey: ['programs'],
    queryFn: curriculumService.getPrograms,
  })

  const primaryEnrollment =
    profile.data?.enrollments.find((item) => item.esPrincipal) ?? profile.data?.enrollments[0]
  const secondaryEnrollment = profile.data?.enrollments.find((item) => !item.esPrincipal)
  const primaryProgramId = primaryEnrollment?.programaId

  const graph = useQuery({
    queryKey: ['graph', studentId, primaryProgramId],
    queryFn: () => curriculumService.getCurriculumGraph(primaryProgramId!, studentId),
    enabled: Boolean(primaryProgramId),
  })
  const progress = useQuery({
    queryKey: ['progress', studentId, primaryProgramId],
    queryFn: () => curriculumService.getProgressSummary(studentId, primaryProgramId!),
    enabled: Boolean(primaryProgramId),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      semestreActual: profile.data?.student?.semestreActual ?? 6,
      cargaMaximaCreditos: profile.data?.student?.cargaMaximaCreditos ?? 20,
      programaPrincipalId: primaryEnrollment?.programaId ?? 'prog_systems',
      programaSecundarioId: secondaryEnrollment?.programaId ?? '',
    },
  })

  const updateHistory = useMutation({
    mutationFn: ({ materiaId, estado }: { materiaId: string; estado: CourseStatus }) =>
      curriculumService.updateHistoryStatus(studentId, materiaId, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      pushToast({ title: 'Historial actualizado' })
    },
    onError: (error) => {
      pushToast({
        title: 'No se pudo actualizar historial',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      })
    },
  })

  const visibleCourses = useMemo(
    () =>
      (graph.data?.materias ?? []).filter((course) => {
        const matchesStatus = statusFilter === 'all' ? true : course.estado === statusFilter
        const normalizedSearch = normalizeSearchText(search)
        const matchesSearch =
          !normalizedSearch ||
          normalizeSearchText(course.nombre).includes(normalizedSearch) ||
          normalizeSearchText(course.codigo).includes(normalizedSearch)
        return matchesStatus && matchesSearch
      }),
    [graph.data?.materias, search, statusFilter],
  )

  if (profile.isLoading || programs.isLoading || graph.isLoading || progress.isLoading) {
    return <LoadingBlock />
  }
  if (
    profile.isError ||
    programs.isError ||
    graph.isError ||
    progress.isError ||
    !profile.data ||
    !programs.data ||
    !graph.data ||
    !progress.data
  ) {
    return <ErrorState message="No se pudo cargar el perfil académico." />
  }

  const primaryProgram = programs.data.find((program) => program.id === primaryEnrollment?.programaId)
  const secondaryProgram = programs.data.find((program) => program.id === secondaryEnrollment?.programaId)
  const semestresRestantes =
    progress.data.semestresRestantesEstimados ??
    Math.max(
      0,
      progress.data.semestreEstimadoGraduacion -
        (profile.data.student?.semestreActual ?? 0),
    )

  const onSubmit = async (values: FormValues) => {
    try {
      await curriculumService.updateStudentProfile(studentId, {
        semestreActual: values.semestreActual,
        cargaMaximaCreditos: values.cargaMaximaCreditos,
      })
      await curriculumService.updateStudentPrograms(studentId, {
        programaPrincipalId: values.programaPrincipalId,
        programaSecundarioId: values.programaSecundarioId || undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['profile', studentId] })
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['double-program'] })
      pushToast({
        title: 'Perfil guardado',
        description: `Carga máxima configurada en ${values.cargaMaximaCreditos} créditos.`,
      })
    } catch (error) {
      pushToast({
        title: 'No se pudo guardar el perfil',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Perfil"
        title="Perfil académico"
        description="Datos personales, programas asociados y edición controlada del historial académico."
      />
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <StatCard title="Semestre actual" value={profile.data.student?.semestreActual ?? '—'} hint="Configuración editable" icon={GraduationCap} />
        <StatCard title="Carga máxima" value={profile.data.student?.cargaMaximaCreditos ?? 20} hint="Créditos por semestre" icon={GraduationCap} />
        <StatCard title="Materias aprobadas" value={progress.data.aprobadas} hint={`${progress.data.creditosAprobados} créditos superados`} icon={BookOpenCheck} />
        <StatCard title="Materias disponibles" value={progress.data.disponiblesProximoSemestre.length} hint="Próximo semestre" icon={Waypoints} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <SectionTitle title="Datos del estudiante" description="Información base y preferencias de carga." />
          <div className="mt-4 space-y-3 text-sm">
            <p><span className="text-slate-500">Nombre:</span> {profile.data.user?.nombre}</p>
            <p><span className="text-slate-500">Código:</span> {profile.data.student?.codigoEstudiantil}</p>
            <p><span className="text-slate-500">Programa principal:</span> {primaryProgram?.nombre ?? 'No configurado'}</p>
            <p><span className="text-slate-500">Segundo programa:</span> {secondaryProgram?.nombre ?? 'No configurado'}</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="profile-current-semester" className="mb-2 block text-sm font-medium">
                Semestre actual
              </label>
              <Input id="profile-current-semester" type="number" {...form.register('semestreActual', { valueAsNumber: true })} />
              {form.formState.errors.semestreActual ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.semestreActual.message}</p> : null}
            </div>
            <div>
              <label htmlFor="profile-max-credits" className="mb-2 block text-sm font-medium">
                Carga máxima por semestre
              </label>
              <Input id="profile-max-credits" type="number" {...form.register('cargaMaximaCreditos', { valueAsNumber: true })} />
              {form.formState.errors.cargaMaximaCreditos ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.cargaMaximaCreditos.message}</p> : null}
            </div>
            <div>
              <label htmlFor="profile-primary-program" className="mb-2 block text-sm font-medium">
                Programa principal
              </label>
              <Select id="profile-primary-program" {...form.register('programaPrincipalId')}>
                {programs.data.filter((program) => program.activo).map((program) => (
                  <option key={program.id} value={program.id}>{program.nombre}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="profile-secondary-program" className="mb-2 block text-sm font-medium">
                Segundo programa opcional
              </label>
              <Select id="profile-secondary-program" {...form.register('programaSecundarioId')}>
                <option value="">Sin segundo programa</option>
                {programs.data.filter((program) => program.activo).map((program) => (
                  <option key={program.id} value={program.id}>{program.nombre}</option>
                ))}
              </Select>
              {form.formState.errors.programaSecundarioId ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.programaSecundarioId.message}</p> : null}
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Save className="h-4 w-4" />
              {form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>

          <div className="mt-6 rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Avance del programa principal</span>
              <strong>{formatPercentage(progress.data.porcentajeAvance)}</strong>
            </div>
            <ProgressBar value={progress.data.porcentajeAvance} className="mt-3" />
            <p className="mt-3 text-sm text-slate-500">
              Graduación estimada en semestre {progress.data.semestreEstimadoGraduacion} con {semestresRestantes} semestre(s) restantes simulados.
            </p>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Historial académico" description="Filtra y ajusta estados desde una interfaz conectada a servicios desacoplados." />
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
            <Input placeholder="Buscar por código o nombre" value={search} onChange={(event) => setSearch(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              {(['all', ...Object.keys(STATUS_LABELS)] as Array<'all' | CourseStatus>).map((status) => (
                <Button key={status} size="sm" variant={statusFilter === status ? 'primary' : 'outline'} onClick={() => setStatusFilter(status)}>
                  {status === 'all' ? 'Todas' : STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3">Materia</th>
                  <th className="pb-3">Código</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibleCourses.map((course) => (
                  <tr key={course.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-3">{course.nombre}</td>
                    <td className="py-3">{course.codigo}</td>
                    <td className="py-3">
                      <div className="flex min-w-48 items-center gap-2">
                        <Badge className={STATUS_COLORS[course.estado]}>{STATUS_LABELS[course.estado]}</Badge>
                        <Select
                          value={course.estado}
                          disabled={updateHistory.isPending}
                          onChange={(event) => updateHistory.mutate({ materiaId: course.id, estado: event.target.value as CourseStatus })}
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleCourses.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No hay materias que coincidan con el filtro actual.</p> : null}
          </div>
        </Card>
      </div>
    </>
  )
}
