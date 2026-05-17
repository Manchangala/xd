import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { adminService } from '@/features/admin/services/adminService'
import { ROLE_LABELS } from '@/lib/constants'
import type { Programa } from '@/types/curriculum'
import type { AdminUserItem } from '@/types/admin'
import type { UserRole } from '@/types/auth'

const userSchema = z.object({
  nombre: z.string().trim().min(3, 'Nombre requerido'),
  email: z.string().email('Email válido requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  rol: z.enum(['student', 'admin', 'advisor']),
  activo: z.boolean(),
  codigoEstudiantil: z.string().optional(),
  semestreActual: z.number().int().min(1).max(12).optional(),
  cargaMaximaCreditos: z.number().int().min(8).max(30).optional(),
  programaPrincipalId: z.string().optional(),
  programaSecundarioId: z.string().optional(),
})

type UserFormValues = z.infer<typeof userSchema>

export function UserManagementPanel({ programs }: { programs: Programa[] }) {
  const queryClient = useQueryClient()
  const { pushToast } = useToast()
  const [selected, setSelected] = useState<AdminUserItem | null>(null)
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  })
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nombre: '',
      email: '',
      password: 'demo123',
      rol: 'student',
      activo: true,
      codigoEstudiantil: '202699002',
      semestreActual: 1,
      cargaMaximaCreditos: 20,
      programaPrincipalId: programs[0]?.id ?? '',
      programaSecundarioId: '',
    },
  })
  const role = useWatch({ control: form.control, name: 'rol' })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
  }

  const createUser = useMutation({
    mutationFn: (values: UserFormValues) =>
      adminService.createUser({
        ...values,
        programaSecundarioId: values.programaSecundarioId || undefined,
      }),
    onSuccess: () => {
      form.reset({
        nombre: '',
        email: '',
        password: 'demo123',
        rol: 'student',
        activo: true,
        codigoEstudiantil: '202699002',
        semestreActual: 1,
        cargaMaximaCreditos: 20,
        programaPrincipalId: programs[0]?.id ?? '',
        programaSecundarioId: '',
      })
      refresh()
      pushToast({ title: 'Usuario creado' })
    },
    onError: (error) => {
      pushToast({
        title: 'No se pudo crear usuario',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      })
    },
  })

  const toggleUser = useMutation({
    mutationFn: (item: AdminUserItem) =>
      adminService.updateUser(item.user.id, { activo: !item.user.activo }),
    onSuccess: () => {
      refresh()
      pushToast({ title: 'Usuario actualizado' })
    },
  })

  const resetPassword = useMutation({
    mutationFn: (userId: string) => adminService.resetUserPassword(userId, 'demo123'),
    onSuccess: () => pushToast({ title: 'Contraseña reiniciada', description: 'Nueva contraseña demo: demo123' }),
  })

  if (users.isLoading) return <LoadingBlock />
  if (users.isError || !users.data) return <ErrorState message="No se pudieron cargar usuarios." />

  const activePrograms = programs.filter((program) => program.activo)

  return (
    <div className="space-y-5">
      <form className="grid gap-3 lg:grid-cols-2" onSubmit={form.handleSubmit((values) => createUser.mutate(values))}>
        <Input placeholder="Nombre" {...form.register('nombre')} />
        <Input placeholder="Email" {...form.register('email')} />
        <Input type="password" placeholder="Contraseña inicial" {...form.register('password')} />
        <Select {...form.register('rol')}>
          <option value="student">Estudiante</option>
          <option value="admin">Administrador</option>
          <option value="advisor">Asesor</option>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('activo')} />
          Usuario activo
        </label>

        {role === 'student' ? (
          <>
            <Input placeholder="Código estudiantil" {...form.register('codigoEstudiantil')} />
            <Input type="number" placeholder="Semestre" {...form.register('semestreActual', { valueAsNumber: true })} />
            <Input type="number" placeholder="Carga máxima" {...form.register('cargaMaximaCreditos', { valueAsNumber: true })} />
            <Select {...form.register('programaPrincipalId')}>
              {activePrograms.map((program) => (
                <option key={program.id} value={program.id}>{program.nombre}</option>
              ))}
            </Select>
            <Select {...form.register('programaSecundarioId')}>
              <option value="">Sin segundo programa</option>
              {activePrograms.map((program) => (
                <option key={program.id} value={program.id}>{program.nombre}</option>
              ))}
            </Select>
          </>
        ) : null}

        <div className="lg:col-span-2">
          <Button type="submit" disabled={createUser.isPending}>Crear usuario</Button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3">Nombre</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Rol</th>
              <th className="pb-3">Estado</th>
              <th className="pb-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.data.map((item) => (
              <tr key={item.user.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-3">{item.user.nombre}</td>
                <td className="py-3">{item.user.email}</td>
                <td className="py-3">{ROLE_LABELS[item.user.rol as UserRole]}</td>
                <td className="py-3">
                  <Badge className={item.user.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                    {item.user.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(item)}>Ver detalle</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleUser.mutate(item)}>
                      {item.user.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => resetPassword.mutate(item.user.id)}>
                      Reset clave
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="rounded-3xl bg-slate-50 p-4 text-sm dark:bg-slate-900">
          <p className="font-semibold">Detalle de usuario</p>
          <p className="mt-2">{selected.user.nombre} · {selected.user.email}</p>
          <p className="mt-1 text-slate-500">Rol: {ROLE_LABELS[selected.user.rol as UserRole]} · {selected.user.activo ? 'Activo' : 'Inactivo'}</p>
          {selected.student ? (
            <p className="mt-1 text-slate-500">
              Código: {selected.student.codigoEstudiantil} · semestre {selected.student.semestreActual} · carga {selected.student.cargaMaximaCreditos} cr.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
