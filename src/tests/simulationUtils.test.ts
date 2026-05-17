import { describe, expect, it } from 'vitest'
import { dependenciasMock } from '@/mocks/courses.mock'
import { historialesMock } from '@/mocks/users.mock'
import {
  calcularBloqueosEnCascada,
  generarRutasAlternativas,
  recalcularEstados,
} from '@/features/simulation/utils/simulationUtils'
import {
  obtenerDependientes,
  obtenerPrerequisitos,
} from '@/features/curriculum/utils/curriculumUtils'
import { normalizeSearchText } from '@/lib/utils'

describe('curriculum graph utils', () => {
  it('normaliza búsquedas con tildes y mayúsculas', () => {
    expect(normalizeSearchText('María José Pardo')).toBe('maria jose pardo')
    expect(normalizeSearchText('  CÁLCULO Integral ')).toBe('calculo integral')
  })

  it('obtiene prerrequisitos y dependientes directos', () => {
    expect(obtenerPrerequisitos('sys_inf202', dependenciasMock)).toEqual(['sys_inf201'])
    expect(obtenerDependientes('sys_inf102', dependenciasMock)).toContain('sys_inf201')
  })

  it('calcula bloqueos en cascada', () => {
    expect(calcularBloqueosEnCascada('sys_inf102', dependenciasMock)).toEqual(
      expect.arrayContaining(['sys_inf201', 'sys_inf202', 'sys_inf301', 'sys_inf401']),
    )
  })
})

describe('simulation utils', () => {
  it('recalcula estados tras una pérdida', () => {
    const history = historialesMock.filter((item) => item.estudianteId === 'student_1')
    const recalculated = recalcularEstados(
      history,
      { materiaId: 'sys_inf102', tipoEvento: 'perdida' },
      dependenciasMock,
    )
    expect(recalculated.find((item) => item.materiaId === 'sys_inf102')?.estado).toBe(
      'reprobada',
    )
    expect(recalculated.find((item) => item.materiaId === 'sys_inf202')?.estado).toBe(
      'bloqueada',
    )
  })

  it('genera tres rutas alternativas coherentes', () => {
    const routes = generarRutasAlternativas('scenario_test', 9)
    expect(routes).toHaveLength(3)
    expect(routes[0].cargaTrabajo).toBe('alta')
    expect(routes[2].semestreEstimadoGraduacion).toBeGreaterThan(
      routes[0].semestreEstimadoGraduacion,
    )
  })
})
