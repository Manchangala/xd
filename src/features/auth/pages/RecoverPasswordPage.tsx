import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/useToast'
import { authService } from '@/features/auth/services/authService'

const schema = z.object({
  email: z.string().email('Ingresa un email válido'),
  code: z.string().optional(),
  newPassword: z.string().min(6, 'Usa mínimo 6 caracteres').optional(),
})

type FormValues = z.infer<typeof schema>

export function RecoverPasswordPage() {
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      code: '',
      newPassword: '',
    },
  })

  const requestCode = async () => {
    const email = form.getValues('email')
    const parsed = z.string().email().safeParse(email)
    if (!parsed.success) {
      form.setError('email', { message: 'Ingresa un email válido' })
      return
    }
    try {
      const result = await authService.requestPasswordRecovery(email)
      setDemoCode(result.demoCode)
      pushToast({ title: 'Código generado', description: result.message })
    } catch (error) {
      pushToast({
        title: 'No se pudo generar el código',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      })
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (!values.code || !values.newPassword) {
      pushToast({ title: 'Faltan datos', description: 'Ingresa el código y la nueva contraseña.' })
      return
    }
    try {
      await authService.confirmPasswordRecovery(values.email, values.code, values.newPassword)
      pushToast({ title: 'Contraseña actualizada', description: 'Ya puedes iniciar sesión.' })
      navigate('/login')
    } catch (error) {
      pushToast({
        title: 'No se pudo actualizar',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-lg p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Recuperación</p>
            <h1 className="text-3xl font-bold">Restablecer contraseña</h1>
          </div>
        </div>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <Input id="recovery-email" {...form.register('email')} />
            {form.formState.errors.email ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.email.message}</p> : null}
          </div>
          <Button type="button" variant="outline" onClick={requestCode}>
            Generar código de recuperación
          </Button>
          {demoCode ? (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              <p>Código visible para validar el flujo de recuperación:</p>
              <strong className="mt-2 block break-all font-mono text-base">{demoCode}</strong>
            </div>
          ) : null}
          <div>
            <label htmlFor="recovery-code" className="mb-2 block text-sm font-medium">
              Código
            </label>
            <Input id="recovery-code" {...form.register('code')} placeholder="Pega aquí el código" />
          </div>
          <div>
            <label htmlFor="recovery-new-password" className="mb-2 block text-sm font-medium">
              Nueva contraseña
            </label>
            <Input id="recovery-new-password" type="password" {...form.register('newPassword')} />
            {form.formState.errors.newPassword ? <p className="mt-1 text-sm text-rose-600">{form.formState.errors.newPassword.message}</p> : null}
          </div>
          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </form>
        <Link className="mt-5 inline-block text-sm font-medium text-brand-700" to="/login">
          Volver al login
        </Link>
      </Card>
    </div>
  )
}
