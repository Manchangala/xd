import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import type { CourseStatus } from '@/types/curriculum'

const statuses: CourseStatus[] = [
  'aprobada',
  'en_curso',
  'disponible',
  'bloqueada',
  'reprobada',
  'pendiente',
]

export function GraphLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
        <span
          key={status}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      ))}
    </div>
  )
}
