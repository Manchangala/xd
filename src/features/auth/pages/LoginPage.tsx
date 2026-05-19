import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { authService } from '@/features/auth/services/authService'
import { useAuthStore } from '@/features/auth/store/authStore'
import { ROLE_LABELS } from '@/lib/constants'
import type { UserRole } from '@/types/auth'

const schema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['student', 'admin', 'advisor']),
})

type FormValues = z.infer<typeof schema>

const roleDefaultEmail: Record<UserRole, string> = {
  student: 'estudiante@curriculapath.edu',
  admin: 'admin@curriculapath.edu',
  advisor: 'asesor@curriculapath.edu',
}

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const { pushToast } = useToast()
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      role: 'student',
    },
  })

  const role = useWatch({ control, name: 'role' })

  const onSubmit = async (values: FormValues) => {
    try {
      const session = await authService.login(
        values.email,
        values.password,
        values.role,
      )
      setSession(session)
      pushToast({
        title: 'Sesión iniciada',
        description: `Entraste como ${ROLE_LABELS[session.user.rol].toLowerCase()}.`,
      })
      navigate(
        session.user.rol === 'admin'
          ? '/admin'
          : session.user.rol === 'advisor'
            ? '/asesor'
            : '/dashboard',
      )
    } catch (error) {
      pushToast({
        title: 'No se pudo iniciar sesión',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      })
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden flex-col justify-between bg-[radial-gradient(circle_at_top_left,_rgba(225,29,72,0.55),_transparent_45%),linear-gradient(135deg,#020617,#111827)] p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold">CurriculaPath</p>
            <p className="text-sm text-slate-300">Simulador dinámico de malla curricular</p>
          </div>
        </div>
        <div>
          <h1 className="max-w-xl text-5xl font-bold leading-tight">
            Planea, simula y compara tu ruta académica antes de decidir.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Explora tu malla, anticipa bloqueos, compara rutas y consulta contexto
            académico desde una sola experiencia.
          </p>
        </div>
        <p className="text-sm text-slate-400">
          Universidad del Norte · Diseño de Software I · CurriculaPath
        </p>
      </section>
      <section className="flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md p-6 md:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
              Acceso
            </p>
            <h2 className="mt-2 text-3xl font-bold">Iniciar sesión</h2>
            <p className="mt-2 text-sm text-slate-500">
              Ingresa con una cuenta académica o usa una cuenta de prueba para recorrer la plataforma.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-2 block text-sm font-medium">Rol</label>
              <Select {...register('role')}>
                <option value="student">Estudiante</option>
                <option value="admin">Administrador</option>
                <option value="advisor">Asesor</option>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <Input {...register('email')} />
              {errors.email ? (
                <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Contraseña</label>
              <Input type="password" {...register('password')} />
              {errors.password ? (
                <p className="mt-1 text-sm text-rose-600">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Iniciar sesión'}
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link className="font-medium text-brand-700" to="/registro">
              Crear cuenta de estudiante
            </Link>
            <Link className="font-medium text-slate-500 hover:text-brand-700" to="/recuperar-clave">
              Recuperar contraseña
            </Link>
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Cuentas de prueba</p>
                <p className="mt-2">Rol seleccionado: {ROLE_LABELS[role]}</p>
                <p>Email: {roleDefaultEmail[role]}</p>
                <p>Contraseña: demo123</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setValue('email', roleDefaultEmail[role], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  setValue('password', 'demo123', {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
              >
                Usar
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
