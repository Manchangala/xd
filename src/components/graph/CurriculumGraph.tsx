import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CourseNode, type CourseNodeData } from '@/components/graph/CourseNode'
import type { CourseWithState, DependenciaMateria } from '@/types/curriculum'

const nodeTypes = {
  course: CourseNode,
}

export function CurriculumGraph({
  courses,
  dependencies,
  selectedCourseId,
  highlightedCourseCodes = [],
  onSelectCourse,
}: {
  courses: CourseWithState[]
  dependencies: DependenciaMateria[]
  selectedCourseId?: string
  highlightedCourseCodes?: string[]
  onSelectCourse?: (courseId: string) => void
}) {
  const highlighted = new Set(highlightedCourseCodes)
  const grouped = courses.reduce<Record<number, CourseWithState[]>>((acc, course) => {
    acc[course.semestreSugerido] ??= []
    acc[course.semestreSugerido].push(course)
    return acc
  }, {})

  const nodes: Node<CourseNodeData>[] = Object.entries(grouped).flatMap(
    ([semester, semesterCourses]) =>
      semesterCourses.map((course, index) => ({
        id: course.id,
        type: 'course',
        position: {
          x: (Number(semester) - 1) * 260,
          y: index * 150,
        },
        data: {
          codigo: course.codigo,
          nombre: course.nombre,
          creditos: course.creditos,
          estado: course.estado,
          selected: selectedCourseId === course.id,
          shared: highlighted.has(course.codigo),
        },
      })),
  )

  const visibleIds = new Set(courses.map((course) => course.id))
  const edges: Edge[] = dependencies
    .filter(
      (dependency) =>
        visibleIds.has(dependency.materiaId) && visibleIds.has(dependency.materiaRequeridaId),
    )
    .map((dependency) => ({
      id: dependency.id,
      source: dependency.materiaRequeridaId,
      target: dependency.materiaId,
      animated: dependency.tipo === 'correquisito',
      label: dependency.tipo === 'correquisito' ? 'correq.' : undefined,
      style: {
        stroke: dependency.tipo === 'correquisito' ? '#f59e0b' : '#64748b',
      },
    }))

  return (
    <div className="h-[620px] overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={(_, node) => onSelectCourse?.(node.id)}
      >
        <Background />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  )
}
