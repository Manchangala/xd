import { Handle, Position, type NodeProps } from '@xyflow/react'
import { STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { CourseStatus } from '@/types/curriculum'

export interface CourseNodeData extends Record<string, unknown> {
  codigo: string
  nombre: string
  creditos: number
  estado: CourseStatus
  selected?: boolean
  shared?: boolean
}

export function CourseNode({ data }: NodeProps) {
  const nodeData = data as unknown as CourseNodeData
  return (
    <div
      className={cn(
        'min-w-44 rounded-2xl border px-4 py-3 shadow-sm transition',
        STATUS_COLORS[nodeData.estado],
        nodeData.selected && 'ring-4 ring-amber-300',
        nodeData.shared && 'ring-4 ring-violet-300',
      )}
    >
      <Handle type="target" position={Position.Left} />
      <p className="text-xs font-semibold opacity-70">{nodeData.codigo}</p>
      <p className="mt-1 text-sm font-semibold">{nodeData.nombre}</p>
      <p className="mt-2 text-xs opacity-70">{nodeData.creditos} créditos</p>
      {nodeData.shared ? (
        <p className="mt-2 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-700">
          Compartida
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
