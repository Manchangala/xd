from datetime import datetime

from app.models.enums import CourseStatus, Difficulty, ScenarioEventType, Workload
from app.schemas.common import ApiModel
from app.schemas.curriculum import HistoryResponse


class SimulationRequest(ApiModel):
    student_id: str
    course_id: str


class SimulationEventResponse(ApiModel):
    materia_id: str
    tipo_evento: ScenarioEventType


class RouteResponse(ApiModel):
    id: str
    escenario_id: str
    nombre: str
    orden: int
    semestre_estimado_graduacion: int
    duracion_estimada: int
    dificultad: Difficulty
    carga_trabajo: Workload
    descripcion: str


class SimulationResponse(ApiModel):
    evento: SimulationEventResponse
    historial_original: list[HistoryResponse]
    historial_simulado: list[HistoryResponse]
    materias_bloqueadas: list[str]
    materias_bloqueadas_directas: list[str]
    materias_bloqueadas_indirectas: list[str]
    impacto_creditos: int
    creditos_disponibles_antes: int
    creditos_disponibles_despues: int
    semestre_estimado_antes: int
    semestre_estimado_despues: int
    explicacion: str
    rutas: list[RouteResponse]


class ScenarioCreateRequest(ApiModel):
    student_id: str
    nombre: str
    descripcion: str
    simulacion: SimulationResponse


class ScenarioResponse(ApiModel):
    id: str
    estudiante_id: str
    nombre: str
    descripcion: str
    creado_en: datetime
    actualizado_en: datetime


class ScenarioEventRecordResponse(ApiModel):
    id: str
    escenario_id: str
    materia_id: str
    tipo_evento: ScenarioEventType


class ScenarioResultResponse(ApiModel):
    id: str
    escenario_id: str
    materia_id: str
    estado_simulado: CourseStatus


class RouteStepResponse(ApiModel):
    id: str
    ruta_id: str
    materia_id: str
    semestre_sugerido: int
    orden: int


class ScenarioSummaryResponse(ApiModel):
    materias_bloqueadas: int
    creditos_disponibles: int
    semestre_estimado_graduacion: int
    creditos_promedio_semestre: int
    promedio_proyectado: float
    carga_trabajo: Workload


class ScenarioSnapshotResponse(ApiModel):
    escenario: ScenarioResponse
    eventos: list[ScenarioEventRecordResponse]
    resultados: list[ScenarioResultResponse]
    rutas: list[RouteResponse]
    pasos_ruta: list[RouteStepResponse]
    resumen: ScenarioSummaryResponse


class ScenarioCompareRequest(ApiModel):
    scenario_a_id: str
    scenario_b_id: str


class ScenarioCompareResponse(ApiModel):
    a: ScenarioSnapshotResponse
    b: ScenarioSnapshotResponse
