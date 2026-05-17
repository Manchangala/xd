import type {
  Escenario,
  EventoEscenario,
  PasoRuta,
  ResultadoEscenario,
  RutaAlternativa,
} from '@/types/scenario'

export const escenariosMock: Escenario[] = [
  {
    id: 'scenario_1',
    estudianteId: 'student_1',
    nombre: 'Recuperar Programación II',
    descripcion: 'Pérdida simulada de Programación II con recuperación intensiva.',
    creadoEn: '2026-05-01T10:00:00.000Z',
    actualizadoEn: '2026-05-01T10:00:00.000Z',
  },
  {
    id: 'scenario_2',
    estudianteId: 'student_1',
    nombre: 'Ruta balanceada semestre 7',
    descripcion: 'Aplazamiento de Redes para equilibrar carga académica.',
    creadoEn: '2026-05-04T10:00:00.000Z',
    actualizadoEn: '2026-05-04T10:00:00.000Z',
  },
  {
    id: 'scenario_3',
    estudianteId: 'student_1',
    nombre: 'Cancelar electiva',
    descripcion: 'Cancelación simulada de Seguridad Informática.',
    creadoEn: '2026-05-08T10:00:00.000Z',
    actualizadoEn: '2026-05-08T10:00:00.000Z',
  },
]

export const eventosEscenarioMock: EventoEscenario[] = [
  {
    id: 'event_1',
    escenarioId: 'scenario_1',
    materiaId: 'sys_inf102',
    tipoEvento: 'perdida',
  },
  {
    id: 'event_2',
    escenarioId: 'scenario_2',
    materiaId: 'sys_inf302',
    tipoEvento: 'aplazamiento',
  },
  {
    id: 'event_3',
    escenarioId: 'scenario_3',
    materiaId: 'sys_elec320',
    tipoEvento: 'cancelacion',
  },
]

export const resultadosEscenarioMock: ResultadoEscenario[] = [
  ['result_1', 'scenario_1', 'sys_inf102', 'reprobada'],
  ['result_2', 'scenario_1', 'sys_inf201', 'bloqueada'],
  ['result_3', 'scenario_1', 'sys_inf202', 'bloqueada'],
  ['result_4', 'scenario_1', 'sys_inf301', 'bloqueada'],
  ['result_5', 'scenario_1', 'sys_inf401', 'bloqueada'],
  ['result_6', 'scenario_2', 'sys_inf302', 'pendiente'],
  ['result_7', 'scenario_3', 'sys_elec320', 'pendiente'],
].map(([id, escenarioId, materiaId, estadoSimulado]) => ({
  id: id as string,
  escenarioId: escenarioId as string,
  materiaId: materiaId as string,
  estadoSimulado: estadoSimulado as ResultadoEscenario['estadoSimulado'],
}))

export const rutasMock: RutaAlternativa[] = [
  {
    id: 'route_1',
    escenarioId: 'scenario_1',
    nombre: 'Ruta acelerada',
    orden: 1,
    semestreEstimadoGraduacion: 9,
    duracionEstimada: 3,
    dificultad: 'alta',
    cargaTrabajo: 'alta',
    descripcion: 'Recupera Programación II de inmediato y mantiene la cadena crítica activa.',
  },
  {
    id: 'route_2',
    escenarioId: 'scenario_1',
    nombre: 'Ruta balanceada',
    orden: 2,
    semestreEstimadoGraduacion: 10,
    duracionEstimada: 4,
    dificultad: 'media',
    cargaTrabajo: 'media',
    descripcion: 'Distribuye la recuperación de la materia y evita picos de carga.',
  },
  {
    id: 'route_3',
    escenarioId: 'scenario_1',
    nombre: 'Ruta pausada',
    orden: 3,
    semestreEstimadoGraduacion: 11,
    duracionEstimada: 5,
    dificultad: 'baja',
    cargaTrabajo: 'baja',
    descripcion: 'Prioriza estabilidad académica con menor carga por semestre.',
  },
  {
    id: 'route_4',
    escenarioId: 'scenario_2',
    nombre: 'Ruta balanceada',
    orden: 1,
    semestreEstimadoGraduacion: 9,
    duracionEstimada: 3,
    dificultad: 'media',
    cargaTrabajo: 'media',
    descripcion: 'Mueve Redes sin alterar la línea crítica de graduación.',
  },
  {
    id: 'route_5',
    escenarioId: 'scenario_3',
    nombre: 'Ruta pausada',
    orden: 1,
    semestreEstimadoGraduacion: 9,
    duracionEstimada: 3,
    dificultad: 'baja',
    cargaTrabajo: 'baja',
    descripcion: 'Reubica una electiva sin comprometer materias núcleo.',
  },
]

export const pasosRutaMock: PasoRuta[] = [
  ['step_1', 'route_1', 'sys_inf102', 6, 1],
  ['step_2', 'route_1', 'sys_inf201', 7, 2],
  ['step_3', 'route_1', 'sys_inf202', 7, 3],
  ['step_4', 'route_1', 'sys_inf301', 8, 4],
  ['step_5', 'route_1', 'sys_inf401', 9, 5],
  ['step_6', 'route_2', 'sys_inf102', 7, 1],
  ['step_7', 'route_2', 'sys_inf201', 8, 2],
  ['step_8', 'route_2', 'sys_inf202', 8, 3],
  ['step_9', 'route_2', 'sys_inf301', 9, 4],
  ['step_10', 'route_2', 'sys_inf401', 10, 5],
  ['step_11', 'route_3', 'sys_inf102', 7, 1],
  ['step_12', 'route_3', 'sys_inf201', 8, 2],
  ['step_13', 'route_3', 'sys_inf202', 9, 3],
  ['step_14', 'route_3', 'sys_inf301', 10, 4],
  ['step_15', 'route_3', 'sys_inf401', 11, 5],
].map(([id, rutaId, materiaId, semestreSugerido, orden]) => ({
  id: id as string,
  rutaId: rutaId as string,
  materiaId: materiaId as string,
  semestreSugerido: semestreSugerido as number,
  orden: orden as number,
}))
