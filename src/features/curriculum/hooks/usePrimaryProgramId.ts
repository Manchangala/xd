import { useQuery } from '@tanstack/react-query'
import { curriculumService } from '@/features/curriculum/services/curriculumService'

export function usePrimaryProgramId(studentId: string) {
  return useQuery({
    queryKey: ['primary-program', studentId],
    queryFn: () => curriculumService.getPrimaryProgramId(studentId),
    enabled: Boolean(studentId),
  })
}
