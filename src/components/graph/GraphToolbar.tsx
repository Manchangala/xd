import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { CourseStatus } from '@/types/curriculum'

export function GraphToolbar({
  search,
  semester,
  status,
  onSearchChange,
  onSemesterChange,
  onStatusChange,
}: {
  search: string
  semester: string
  status: string
  onSearchChange: (value: string) => void
  onSemesterChange: (value: string) => void
  onStatusChange: (value: string) => void
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
      <Input
        placeholder="Buscar por código o nombre"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <Select value={semester} onChange={(event) => onSemesterChange(event.target.value)}>
        <option value="all">Todos los semestres</option>
        {Array.from({ length: 8 }).map((_, index) => (
          <option key={index + 1} value={String(index + 1)}>
            Semestre {index + 1}
          </option>
        ))}
      </Select>
      <Select value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="all">Todos los estados</option>
        {(
          [
            'aprobada',
            'en_curso',
            'disponible',
            'bloqueada',
            'reprobada',
            'pendiente',
          ] as CourseStatus[]
        ).map(
          (item) => (
            <option key={item} value={item}>
              {item.replace('_', ' ')}
            </option>
          ),
        )}
      </Select>
    </div>
  )
}
