import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { curriculumService } from '@/features/curriculum/services/curriculumService'
import { authService } from '@/features/auth/services/authService'
import { useAuthStore } from '@/features/auth/store/authStore'

const schema = z
  .object({
    nombre: z.string().trim().min(3, 'Escribe tu nombre completo'),
    email: z.string().email('Ingresa un email válido'),
    password: z.string().min(6, 'Usa mínimo 6 caracteres'),
    codigoEstudiantil: z.string().trim().min(5, 'Código estudiantil requerido'),
    semestreActual: z.number().int().min(1).max(12),
    cargaMaximaCreditos: z.number().int().min(8).max(30),
    programaPrincipalId: z.string().min(1, 'Selecciona un programa principal'),
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

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const { pushToast } = useToast()
  const programs = useQuery({
    queryKey: ['programs'],
    queryFn: curriculumService.getPrograms,
  })
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      codigoEstudiantil: '',
      semestreActual: 1,
      cargaMaximaCreditos: 20,
      programaPrincipalId: '',
      programaSecundarioId: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const session = await authService.register({
        ...values,
        programaSecundarioId: values.programaSecundarioId || undefined,
      })
      setSession(session)
      pushToast({
        title: 'Registro creado',
        description: 'Tu perfil académico quedó listo para planear la malla.',
      })
      navigate('/dashboard')
    } catch (error) {
      pushToast({
        title: 'No se pudo registrar',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-900 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(225,29,72,0.45),_transparent_45%),linear-gradient(135deg,#020617,#111827)] p-8 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold">CurriculaPath</p>
              <p className="text-sm text-slate-300">Registro académico guiado</p>
            </div>
          </div>
          <h1 className="mt-12 text-4xl font-bold leading-tight md:text-5xl">
            Crea el perfil, selecciona programas y empieza a simular rutas desde el primer minuto.
          </h1>
          <p className="mt-5 text-slate-300">
            El registro ya deja preparado el historial inicial, la malla activa y la capacidad para doble programa.
          </p>
        </section>

        <Card className="p-6 md:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
              Nuevo usuario
            </p>
            <h2 className="mt-2 text-3xl font-bold">Registro de estudiante</h2>
            <p className="mt-2 text-sm text-slate-500">
              Funciona con datos locales o con la API real si está activa en configuración.
            </p>
          </div>

          {programs.isLoading ? <LoadingBlock /> : null}
          {programs.isError ? <ErrorState message="No se pudieron cargar los programas." /> : null}

          {programs.data ? (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Nombre completo</label>
                <Input {...form.register('nombre')} />
                {form.formState.errors.nombre ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.nombre.message}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <Input {...form.register('email')} />
                {form.formState.errors.email ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.email.message}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Contraseña</label>
                <Input type="password" {...form.register('password')} />
                {form.formState.errors.password ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.password.message}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Código estudiantil</label>
                <Input {...form.register('codigoEstudiantil')} />
                {form.formState.errors.codigoEstudiantil ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.codigoEstudiantil.message}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Semestre actual</label>
                <Input type="number" {...form.register('semestreActual', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Programa principal</label>
                <Select {...form.register('programaPrincipalId')}>
                  <option value="">Selecciona un programa</option>
                  {programs.data.filter((program) => program.activo).map((program) => (
                    <option key={program.id} value={program.id}>{program.nombre}</option>
                  ))}
                </Select>
                {form.formState.errors.programaPrincipalId ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.programaPrincipalId.message}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Segundo programa opcional</label>
                <Select {...form.register('programaSecundarioId')}>
                  <option value="">Sin segundo programa</option>
                  {programs.data.filter((program) => program.activo).map((program) => (
                    <option key={program.id} value={program.id}>{program.nombre}</option>
                  ))}
                </Select>
                {form.formState.errors.programaSecundarioId ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.programaSecundarioId.message}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Carga máxima de créditos</label>
                <Input type="number" {...form.register('cargaMaximaCreditos', { valueAsNumber: true })} />
              </div>
              <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  <UserPlus className="h-4 w-4" />
                  {form.formState.isSubmitting ? 'Creando...' : 'Crear perfil'}
                </Button>
                <Link className="text-sm font-medium text-brand-700" to="/login">
                  Ya tengo cuenta
                </Link>
              </div>
            </form>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
