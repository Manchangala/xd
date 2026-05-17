import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database, GraduationCap, Layers3, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { StatCard } from '@/components/cards/StatCard'
import { AccessDenied } from '@/components/ui/access'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page'
import { SectionTitle } from '@/components/ui/section'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { SystemStatusPanel } from '@/features/admin/components/SystemStatusPanel'
import { UserManagementPanel } from '@/features/admin/components/UserManagementPanel'
import { adminService } from '@/features/admin/services/adminService'
import { useAuthStore } from '@/features/auth/store/authStore'

type Tab =
  | 'sistema'
  | 'usuarios'
  | 'programas'
  | 'materias'
  | 'versiones'
  | 'dependencias'

const tabLabels: Record<Tab, string> = {
  sistema: 'Estado sistema',
  usuarios: 'Usuarios',
  programas: 'Programas',
  materias: 'Materias',
  versiones: 'Versiones',
  dependencias: 'Dependencias',
}

const programSchema = z.object({
  codigo: z.string().trim().min(3, 'Usa al menos 3 caracteres'),
  nombre: z.string().trim().min(4, 'Escribe un nombre válido'),
  totalCreditos: z.number().int().min(1).max(300),
})

const courseSchema = z.object({
  versionMallaId: z.string().min(1),
  codigo: z.string().trim().min(3, 'Usa al menos 3 caracteres'),
  nombre: z.string().trim().min(4, 'Escribe un nombre válido'),
  creditos: z.number().int().min(1).max(12),
  semestreSugerido: z.number().int().min(1).max(12),
  electiva: z.boolean(),
})

const versionSchema = z.object({
  programaId: z.string().min(1),
  nombreVersion: z.string().trim().min(3, 'Escribe un nombre válido'),
  anioVigencia: z.number().int().min(2000).max(2100),
})

type ProgramFormValues = z.infer<typeof programSchema>
type CourseFormValues = z.infer<typeof courseSchema>
type VersionFormValues = z.infer<typeof versionSchema>

export function AdminPage() {
  const role = useAuthStore((state) => state.session?.user.rol)
  const [tab, setTab] = useState<Tab>('sistema')
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | null>(
    null,
  )
  const [dependencyCourse, setDependencyCourse] = useState('sys_inf202')
  const [dependencyRequired, setDependencyRequired] = useState('sys_inf201')
  const [dependencyType, setDependencyType] = useState<
    'prerequisito' | 'correquisito'
  >('prerequisito')
  const queryClient = useQueryClient()
  const { pushToast } = useToast()
  const notifyMutationError = (title: string) => (error: unknown) =>
    pushToast({
      title,
      description:
        error instanceof Error ? error.message : 'Revisa los datos e intenta de nuevo.',
    })

  const overview = useQuery({
    queryKey: ['admin-overview'],
    queryFn: adminService.getOverview,
  })
  const dashboard = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminService.getDashboardData,
  })

  const programForm = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      totalCreditos: 150,
    },
  })
  const courseForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      versionMallaId: 'ver_sys_2025',
      codigo: '',
      nombre: '',
      creditos: 3,
      semestreSugerido: 1,
      electiva: false,
    },
  })
  const versionForm = useForm<VersionFormValues>({
    resolver: zodResolver(versionSchema),
    defaultValues: {
      programaId: 'prog_systems',
      nombreVersion: 'Plan 2026',
      anioVigencia: 2026,
    },
  })

  const refreshAdmin = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
  }

  const createProgram = useMutation({
    mutationFn: (values: ProgramFormValues) =>
      adminService.createProgram({
        ...values,
        activo: true,
      }),
    onSuccess: (program) => {
      setSelectedProgramId(program.id)
      programForm.reset()
      refreshAdmin()
      pushToast({ title: 'Programa creado' })
    },
    onError: notifyMutationError('No se pudo crear el programa'),
  })
  const updateProgram = useMutation({
    mutationFn: ({
      programId,
      values,
    }: {
      programId: string
      values: ProgramFormValues
    }) => adminService.updateProgram(programId, values),
    onSuccess: () => {
      setEditingProgramId(null)
      programForm.reset()
      refreshAdmin()
      pushToast({ title: 'Programa actualizado' })
    },
    onError: notifyMutationError('No se pudo actualizar el programa'),
  })
  const toggleProgram = useMutation({
    mutationFn: adminService.toggleProgram,
    onSuccess: () => {
      refreshAdmin()
      pushToast({ title: 'Programa actualizado' })
    },
    onError: notifyMutationError('No se pudo cambiar el estado del programa'),
  })

  const createCourse = useMutation({
    mutationFn: (values: CourseFormValues) => adminService.createCourse(values),
    onSuccess: (course) => {
      setSelectedCourseId(course.id)
      courseForm.reset({
        versionMallaId: course.versionMallaId,
        codigo: '',
        nombre: '',
        creditos: 3,
        semestreSugerido: 1,
        electiva: false,
      })
      refreshAdmin()
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      pushToast({ title: 'Materia creada' })
    },
    onError: notifyMutationError('No se pudo crear la materia'),
  })
  const updateCourse = useMutation({
    mutationFn: ({
      courseId,
      values,
    }: {
      courseId: string
      values: CourseFormValues
    }) => adminService.updateCourse(courseId, values),
    onSuccess: () => {
      setEditingCourseId(null)
      courseForm.reset()
      refreshAdmin()
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      pushToast({ title: 'Materia actualizada' })
    },
    onError: notifyMutationError('No se pudo actualizar la materia'),
  })

  const createVersion = useMutation({
    mutationFn: (values: VersionFormValues) =>
      adminService.createVersion({
        ...values,
        activa: false,
      }),
    onSuccess: (version) => {
      setSelectedVersionId(version.id)
      versionForm.reset()
      refreshAdmin()
      pushToast({ title: 'Versión creada' })
    },
    onError: notifyMutationError('No se pudo crear la versión'),
  })
  const updateVersion = useMutation({
    mutationFn: ({
      versionId,
      values,
    }: {
      versionId: string
      values: VersionFormValues
    }) => adminService.updateVersion(versionId, values),
    onSuccess: () => {
      setEditingVersionId(null)
      versionForm.reset()
      refreshAdmin()
      pushToast({ title: 'Versión actualizada' })
    },
    onError: notifyMutationError('No se pudo actualizar la versión'),
  })
  const toggleVersion = useMutation({
    mutationFn: adminService.toggleVersion,
    onSuccess: () => {
      refreshAdmin()
      pushToast({ title: 'Versión actualizada' })
    },
    onError: (error) =>
      pushToast({
        title: 'No se pudo actualizar la versión',
        description:
          error instanceof Error ? error.message : 'Intenta de nuevo.',
      }),
  })

  const createDependency = useMutation({
    mutationFn: () =>
      adminService.createDependency({
        materiaId: dependencyCourse,
        materiaRequeridaId: dependencyRequired,
        tipo: dependencyType,
      }),
    onSuccess: (dependency) => {
      setSelectedDependencyId(dependency.id)
      refreshAdmin()
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      pushToast({ title: 'Dependencia creada' })
    },
    onError: (error) =>
      pushToast({
        title: 'No se pudo crear la dependencia',
        description:
          error instanceof Error ? error.message : 'Intenta de nuevo.',
      }),
  })
  const deleteDependency = useMutation({
    mutationFn: adminService.deleteDependency,
    onSuccess: () => {
      setSelectedDependencyId(null)
      refreshAdmin()
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      pushToast({ title: 'Dependencia eliminada' })
    },
    onError: notifyMutationError('No se pudo eliminar la dependencia'),
  })

  if (role !== 'admin') return <AccessDenied role="administrador" />
  if (overview.isLoading || dashboard.isLoading) return <LoadingBlock />
  if (overview.isError || dashboard.isError || !overview.data || !dashboard.data) {
    return <ErrorState message="No se pudo cargar la administración." />
  }

  const programsById = new Map(
    dashboard.data.programas.map((program) => [program.id, program]),
  )
  const versionsById = new Map(
    dashboard.data.versiones.map((version) => [version.id, version]),
  )
  const coursesById = new Map(
    dashboard.data.materias.map((course) => [course.id, course]),
  )
  const courseNames = new Map(
    dashboard.data.materias.map((course) => [
      course.id,
      `${course.codigo} · ${course.nombre}`,
    ]),
  )
  const selectedProgram = selectedProgramId
    ? programsById.get(selectedProgramId)
    : undefined
  const selectedCourse = selectedCourseId
    ? coursesById.get(selectedCourseId)
    : undefined
  const selectedVersion = selectedVersionId
    ? versionsById.get(selectedVersionId)
    : undefined
  const selectedDependency = selectedDependencyId
    ? dashboard.data.dependencias.find(
        (dependency) => dependency.id === selectedDependencyId,
      )
    : undefined
  const canCreateDependency =
    dependencyCourse &&
    dependencyRequired &&
    dependencyCourse !== dependencyRequired

  const handleProgramSubmit = (values: ProgramFormValues) => {
    if (editingProgramId) {
      updateProgram.mutate({ programId: editingProgramId, values })
      return
    }
    createProgram.mutate(values)
  }

  const handleCourseSubmit = (values: CourseFormValues) => {
    if (editingCourseId) {
      updateCourse.mutate({ courseId: editingCourseId, values })
      return
    }
    createCourse.mutate(values)
  }

  const handleVersionSubmit = (values: VersionFormValues) => {
    if (editingVersionId) {
      updateVersion.mutate({ versionId: editingVersionId, values })
      return
    }
    createVersion.mutate(values)
  }

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Panel de administración"
        description="Gestión de programas, materias, versiones y dependencias sobre una capa de servicios desacoplada y ya conectada."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Estudiantes activos"
          value={overview.data.estudiantesActivos}
          hint="Usuarios habilitados"
          icon={Users}
        />
        <StatCard
          title="Programas"
          value={overview.data.programas}
          hint="Planes disponibles"
          icon={GraduationCap}
        />
        <StatCard
          title="Materias"
          value={overview.data.totalMaterias}
          hint="Catálogo global"
          icon={Layers3}
        />
        <StatCard
          title="Completitud promedio"
          value={`${overview.data.completitudPromedio}%`}
          hint="Mallas validadas"
          icon={Database}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionTitle
            title="Gestión académica"
            description="Cada pestaña permite crear, editar, revisar detalle y cambiar estados desde la misma interfaz."
          />
          <div className="mb-5 flex flex-wrap gap-2">
            {(
              [
                'sistema',
                'usuarios',
                'programas',
                'materias',
                'versiones',
                'dependencias',
              ] as Tab[]
            ).map((item) => (
              <Button
                key={item}
                variant={tab === item ? 'primary' : 'outline'}
                onClick={() => setTab(item)}
              >
                {tabLabels[item]}
              </Button>
            ))}
          </div>

          {tab === 'sistema' ? <SystemStatusPanel /> : null}

          {tab === 'usuarios' ? (
            <UserManagementPanel programs={dashboard.data.programas} />
          ) : null}

          {tab === 'programas' ? (
            <div className="space-y-5">
              <form
                className="grid gap-3 lg:grid-cols-[0.6fr_1fr_0.5fr_auto]"
                onSubmit={programForm.handleSubmit(handleProgramSubmit)}
              >
                <div>
                  <Input placeholder="Código" {...programForm.register('codigo')} />
                  {programForm.formState.errors.codigo ? (
                    <p className="mt-1 text-xs text-rose-600">
                      {programForm.formState.errors.codigo.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Input
                    placeholder="Nombre del programa"
                    {...programForm.register('nombre')}
                  />
                  {programForm.formState.errors.nombre ? (
                    <p className="mt-1 text-xs text-rose-600">
                      {programForm.formState.errors.nombre.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Créditos"
                    {...programForm.register('totalCreditos', {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingProgramId ? 'Guardar' : 'Crear'}
                  </Button>
                  {editingProgramId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingProgramId(null)
                        programForm.reset()
                      }}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[38rem] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-3">Código</th>
                      <th className="pb-3">Nombre</th>
                      <th className="pb-3">Créditos</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.data.programas.map((program) => (
                      <tr
                        key={program.id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-3">{program.codigo}</td>
                        <td className="py-3">{program.nombre}</td>
                        <td className="py-3">{program.totalCreditos}</td>
                        <td className="py-3">
                          <Badge
                            className={
                              program.activo
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }
                          >
                            {program.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedProgramId(program.id)}
                            >
                              Ver detalle
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingProgramId(program.id)
                                programForm.reset({
                                  codigo: program.codigo,
                                  nombre: program.nombre,
                                  totalCreditos: program.totalCreditos,
                                })
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleProgram.mutate(program.id)}
                            >
                              {program.activo ? 'Desactivar' : 'Activar'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedProgram ? (
                <div className="rounded-3xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
                  <p className="font-semibold">Detalle del programa</p>
                  <p className="mt-2">
                    {selectedProgram.codigo} · {selectedProgram.nombre}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {selectedProgram.totalCreditos} créditos ·{' '}
                    {selectedProgram.activo ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'materias' ? (
            <div className="space-y-5">
              <form
                className="grid gap-3 lg:grid-cols-2"
                onSubmit={courseForm.handleSubmit(handleCourseSubmit)}
              >
                <Select {...courseForm.register('versionMallaId')}>
                  {dashboard.data.versiones.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.nombreVersion} ·{' '}
                      {programsById.get(version.programaId)?.nombre}
                    </option>
                  ))}
                </Select>
                <Input placeholder="Código" {...courseForm.register('codigo')} />
                <Input placeholder="Nombre" {...courseForm.register('nombre')} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="number"
                    placeholder="Créditos"
                    {...courseForm.register('creditos', { valueAsNumber: true })}
                  />
                  <Input
                    type="number"
                    placeholder="Semestre"
                    {...courseForm.register('semestreSugerido', {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...courseForm.register('electiva')} />
                  Materia electiva
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">
                    {editingCourseId ? 'Guardar cambios' : 'Crear materia'}
                  </Button>
                  {editingCourseId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingCourseId(null)
                        courseForm.reset()
                      }}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </form>

              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-3">Código</th>
                      <th className="pb-3">Materia</th>
                      <th className="pb-3">Plan</th>
                      <th className="pb-3">Créditos</th>
                      <th className="pb-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.data.materias.map((course) => (
                      <tr
                        key={course.id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-3">{course.codigo}</td>
                        <td className="py-3">{course.nombre}</td>
                        <td className="py-3">
                          {versionsById.get(course.versionMallaId)?.nombreVersion}
                        </td>
                        <td className="py-3">{course.creditos} cr.</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedCourseId(course.id)}
                            >
                              Ver detalle
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCourseId(course.id)
                                courseForm.reset({
                                  versionMallaId: course.versionMallaId,
                                  codigo: course.codigo,
                                  nombre: course.nombre,
                                  creditos: course.creditos,
                                  semestreSugerido: course.semestreSugerido,
                                  electiva: course.electiva,
                                })
                              }}
                            >
                              Editar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedCourse ? (
                <div className="rounded-3xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
                  <p className="font-semibold">Detalle de materia</p>
                  <p className="mt-2">
                    {selectedCourse.codigo} · {selectedCourse.nombre}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {selectedCourse.creditos} créditos · Semestre{' '}
                    {selectedCourse.semestreSugerido} ·{' '}
                    {selectedCourse.electiva ? 'Electiva' : 'Obligatoria'}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'versiones' ? (
            <div className="space-y-5">
              <form
                className="grid gap-3 lg:grid-cols-[1fr_1fr_0.5fr_auto]"
                onSubmit={versionForm.handleSubmit(handleVersionSubmit)}
              >
                <Select {...versionForm.register('programaId')}>
                  {dashboard.data.programas.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.nombre}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Nombre de versión"
                  {...versionForm.register('nombreVersion')}
                />
                <Input
                  type="number"
                  placeholder="Año"
                  {...versionForm.register('anioVigencia', {
                    valueAsNumber: true,
                  })}
                />
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingVersionId ? 'Guardar' : 'Crear'}
                  </Button>
                  {editingVersionId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingVersionId(null)
                        versionForm.reset()
                      }}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </form>

              <div className="space-y-3">
                {dashboard.data.versiones.map((version) => (
                  <div
                    key={version.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{version.nombreVersion}</p>
                        <Badge
                          className={
                            version.activa
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }
                        >
                          {version.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {programsById.get(version.programaId)?.nombre} ·{' '}
                        {version.anioVigencia}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedVersionId(version.id)}
                      >
                        Ver detalle
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingVersionId(version.id)
                          versionForm.reset({
                            programaId: version.programaId,
                            nombreVersion: version.nombreVersion,
                            anioVigencia: version.anioVigencia,
                          })
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleVersion.mutate(version.id)}
                      >
                        {version.activa ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedVersion ? (
                <div className="rounded-3xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
                  <p className="font-semibold">Detalle de versión</p>
                  <p className="mt-2">
                    {selectedVersion.nombreVersion} · {selectedVersion.anioVigencia}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Programa:{' '}
                    {programsById.get(selectedVersion.programaId)?.nombre} ·{' '}
                    {selectedVersion.activa ? 'Activa' : 'Inactiva'}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'dependencias' ? (
            <div className="space-y-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.7fr_auto]">
                <Select
                  value={dependencyCourse}
                  onChange={(event) => setDependencyCourse(event.target.value)}
                >
                  {dashboard.data.materias.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.codigo} · {course.nombre}
                    </option>
                  ))}
                </Select>
                <Select
                  value={dependencyRequired}
                  onChange={(event) => setDependencyRequired(event.target.value)}
                >
                  {dashboard.data.materias.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.codigo} · {course.nombre}
                    </option>
                  ))}
                </Select>
                <Select
                  value={dependencyType}
                  onChange={(event) =>
                    setDependencyType(
                      event.target.value as 'prerequisito' | 'correquisito',
                    )
                  }
                >
                  <option value="prerequisito">Prerrequisito</option>
                  <option value="correquisito">Correquisito</option>
                </Select>
                <Button
                  onClick={() => createDependency.mutate()}
                  disabled={!canCreateDependency}
                >
                  Crear
                </Button>
              </div>
              {!canCreateDependency ? (
                <p className="text-sm text-amber-700">
                  Selecciona dos materias distintas para crear una relación válida.
                </p>
              ) : null}

              <div className="max-h-80 overflow-auto">
                {dashboard.data.dependencias.map((dependency) => (
                  <div
                    key={dependency.id}
                    className="flex flex-col gap-3 border-t border-slate-100 py-3 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      {courseNames.get(dependency.materiaId) ?? dependency.materiaId} ←{' '}
                      {courseNames.get(dependency.materiaRequeridaId) ??
                        dependency.materiaRequeridaId}{' '}
                      · {dependency.tipo}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedDependencyId(dependency.id)}
                      >
                        Ver detalle
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteDependency.mutate(dependency.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedDependency ? (
                <div className="rounded-3xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
                  <p className="font-semibold">Detalle de dependencia</p>
                  <p className="mt-2">
                    {courseNames.get(selectedDependency.materiaId)} ←{' '}
                    {courseNames.get(selectedDependency.materiaRequeridaId)}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Tipo: {selectedDependency.tipo}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card>
          <SectionTitle
            title="Actividad reciente"
            description="Trazabilidad visual de cambios administrativos."
          />
          <div className="mt-4 space-y-3">
            {dashboard.data.activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800"
              >
                <p className="font-medium">{activity.descripcion}</p>
                <p className="mt-1 text-slate-500">{activity.fecha.slice(0, 10)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
