from datetime import datetime

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.entities import (
    AcademicHistory,
    AdminActivity,
    ChatMessage,
    ChatSession,
    Course,
    CourseDependency,
    CurriculumDocument,
    CurriculumVersion,
    DocumentChunk,
    DocumentExtraction,
    Program,
    ProgramEnrollment,
    RagQuery,
    RouteStep,
    Scenario,
    ScenarioEvent,
    ScenarioResult,
    Student,
    SuggestedRoute,
    User,
)
from app.models.enums import (
    ChatSender,
    CourseStatus,
    DependencyType,
    Difficulty,
    DocumentProcessingStatus,
    ExtractionMethod,
    LocalModel,
    ScenarioEventType,
    UserRole,
    Workload,
)

NOW = datetime.fromisoformat("2026-05-15T08:00:00+00:00")


ADMIN_ACTIVITIES = [
    {
        "id": "act_1",
        "descripcion": "Nueva materia creada: Seguridad Informática",
        "fecha": datetime.fromisoformat("2026-05-14T15:00:00+00:00"),
        "tipo": "materia",
    },
    {
        "id": "act_2",
        "descripcion": "Malla 2025 de Ingeniería de Sistemas actualizada",
        "fecha": datetime.fromisoformat("2026-05-13T12:00:00+00:00"),
        "tipo": "malla",
    },
    {
        "id": "act_3",
        "descripcion": "Prerrequisito modificado: INF202 requiere INF201",
        "fecha": datetime.fromisoformat("2026-05-12T09:30:00+00:00"),
        "tipo": "dependencia",
    },
    {
        "id": "act_4",
        "descripcion": "Estudiante transferido a doble programa",
        "fecha": datetime.fromisoformat("2026-05-11T10:45:00+00:00"),
        "tipo": "estudiante",
    },
]


USERS = [
    {
        "id": "user_student",
        "nombre": "Gabriel Jiménez",
        "email": "estudiante@curriculapath.edu",
        "rol": UserRole.STUDENT,
        "creado_en": datetime.fromisoformat("2026-01-12T08:00:00+00:00"),
    },
    {
        "id": "user_admin",
        "nombre": "Laura Mendoza",
        "email": "admin@curriculapath.edu",
        "rol": UserRole.ADMIN,
        "creado_en": datetime.fromisoformat("2026-01-10T08:00:00+00:00"),
    },
    {
        "id": "user_advisor",
        "nombre": "Camila Torres",
        "email": "asesor@curriculapath.edu",
        "rol": UserRole.ADVISOR,
        "creado_en": datetime.fromisoformat("2026-01-11T08:00:00+00:00"),
    },
    {
        "id": "user_student_2",
        "nombre": "María José Pardo",
        "email": "maria.pardo@curriculapath.edu",
        "rol": UserRole.STUDENT,
        "creado_en": datetime.fromisoformat("2026-02-01T08:00:00+00:00"),
    },
]

STUDENTS = [
    {
        "id": "student_1",
        "usuario_id": "user_student",
        "codigo_estudiantil": "202012345",
        "semestre_actual": 6,
        "creado_en": datetime.fromisoformat("2026-01-12T08:00:00+00:00"),
    },
    {
        "id": "student_2",
        "usuario_id": "user_student_2",
        "codigo_estudiantil": "202145678",
        "semestre_actual": 4,
        "creado_en": datetime.fromisoformat("2026-02-01T08:00:00+00:00"),
    },
]

PROGRAMS = [
    {
        "id": "prog_systems",
        "codigo": "INGSIS",
        "nombre": "Ingeniería de Sistemas",
        "total_creditos": 162,
        "activo": True,
    },
    {
        "id": "prog_business",
        "codigo": "ADMIN",
        "nombre": "Administración de Empresas",
        "total_creditos": 150,
        "activo": True,
    },
]

VERSIONS = [
    {
        "id": "ver_sys_2025",
        "programa_id": "prog_systems",
        "nombre_version": "Plan 2025",
        "anio_vigencia": 2025,
        "activa": True,
    },
    {
        "id": "ver_adm_2025",
        "programa_id": "prog_business",
        "nombre_version": "Plan 2025",
        "anio_vigencia": 2025,
        "activa": True,
    },
]

ENROLLMENTS = [
    {
        "id": "enroll_1",
        "estudiante_id": "student_1",
        "programa_id": "prog_systems",
        "es_principal": True,
        "fecha_inscripcion": datetime.fromisoformat("2026-01-12T08:00:00+00:00"),
    },
    {
        "id": "enroll_2",
        "estudiante_id": "student_1",
        "programa_id": "prog_business",
        "es_principal": False,
        "fecha_inscripcion": datetime.fromisoformat("2026-01-12T08:00:00+00:00"),
    },
    {
        "id": "enroll_3",
        "estudiante_id": "student_2",
        "programa_id": "prog_systems",
        "es_principal": True,
        "fecha_inscripcion": datetime.fromisoformat("2026-02-01T08:00:00+00:00"),
    },
]

COURSES = [
    ("sys_mat101", "ver_sys_2025", "MAT101", "Cálculo Diferencial", 4, 1, False),
    ("sys_mat201", "ver_sys_2025", "MAT201", "Álgebra Lineal", 3, 1, False),
    ("sys_inf101", "ver_sys_2025", "INF101", "Programación I", 4, 1, False),
    ("sys_hum101", "ver_sys_2025", "HUM101", "Comunicación Oral", 2, 1, False),
    ("sys_fis101", "ver_sys_2025", "FIS101", "Física Mecánica", 3, 2, False),
    ("sys_mat102", "ver_sys_2025", "MAT102", "Cálculo Integral", 4, 2, False),
    ("sys_inf102", "ver_sys_2025", "INF102", "Programación II", 4, 2, False),
    ("sys_hum102", "ver_sys_2025", "HUM102", "Ética y Ciudadanía", 2, 2, False),
    ("sys_fis102", "ver_sys_2025", "FIS102", "Electromagnetismo", 3, 3, False),
    ("sys_inf203", "ver_sys_2025", "INF203", "Arquitectura de Computadores", 3, 3, False),
    ("sys_est201", "ver_sys_2025", "EST201", "Probabilidad y Estadística", 3, 3, False),
    ("sys_inf201", "ver_sys_2025", "INF201", "Estructuras de Datos", 4, 3, False),
    ("sys_inf202", "ver_sys_2025", "INF202", "Bases de Datos", 4, 4, False),
    ("sys_inf301", "ver_sys_2025", "INF301", "Ingeniería de Software", 4, 5, False),
    ("sys_inf302", "ver_sys_2025", "INF302", "Redes de Computadores", 3, 5, False),
    ("sys_inf303", "ver_sys_2025", "INF303", "Sistemas Operativos", 4, 5, False),
    ("sys_eco210", "ver_sys_2025", "ECO210", "Economía para Ingenieros", 3, 4, False),
    ("sys_adm100", "ver_sys_2025", "ADM100", "Administración General", 3, 4, False),
    ("sys_elec310", "ver_sys_2025", "ELEC310", "Inteligencia Artificial", 3, 6, True),
    ("sys_elec320", "ver_sys_2025", "ELEC320", "Seguridad Informática", 3, 6, True),
    ("sys_inv400", "ver_sys_2025", "INV400", "Metodología de Investigación", 2, 7, False),
    ("sys_inf401", "ver_sys_2025", "INF401", "Proyecto Final", 6, 8, False),
    ("adm_adm101", "ver_adm_2025", "ADM101", "Fundamentos de Administración", 3, 1, False),
    ("adm_mat101", "ver_adm_2025", "MAT101", "Cálculo Diferencial", 4, 1, False),
    ("adm_hum101", "ver_adm_2025", "HUM101", "Comunicación Oral", 2, 1, False),
    ("adm_est201", "ver_adm_2025", "EST201", "Probabilidad y Estadística", 3, 2, False),
    ("adm_eco101", "ver_adm_2025", "ECO101", "Microeconomía", 3, 2, False),
    ("adm_con101", "ver_adm_2025", "CON101", "Contabilidad Financiera", 3, 2, False),
    ("adm_hum102", "ver_adm_2025", "HUM102", "Ética y Ciudadanía", 2, 2, False),
    ("adm_eco102", "ver_adm_2025", "ECO102", "Macroeconomía", 3, 3, False),
    ("adm_con102", "ver_adm_2025", "CON102", "Costos y Presupuestos", 3, 3, False),
    ("adm_adm201", "ver_adm_2025", "ADM201", "Mercadeo", 3, 3, False),
    ("adm_adm202", "ver_adm_2025", "ADM202", "Gestión del Talento Humano", 3, 3, False),
    ("adm_der101", "ver_adm_2025", "DER101", "Derecho Empresarial", 2, 3, False),
    ("adm_adm203", "ver_adm_2025", "ADM203", "Gestión de Operaciones", 3, 4, False),
    ("adm_adm301", "ver_adm_2025", "ADM301", "Finanzas Corporativas", 3, 4, False),
    ("adm_adm302", "ver_adm_2025", "ADM302", "Estrategia Empresarial", 3, 5, False),
    ("adm_adm303", "ver_adm_2025", "ADM303", "Emprendimiento", 3, 5, False),
    ("adm_adm401", "ver_adm_2025", "ADM401", "Consultoría Empresarial", 3, 6, False),
    ("adm_adm402", "ver_adm_2025", "ADM402", "Analítica de Negocios", 3, 6, True),
    ("adm_inv400", "ver_adm_2025", "INV400", "Metodología de Investigación", 2, 7, False),
    ("adm_adm499", "ver_adm_2025", "ADM499", "Proyecto de Grado", 6, 8, False),
]

DEPENDENCIES = [
    ("dep_1", "sys_mat102", "sys_mat101", DependencyType.PREREQUISITO),
    ("dep_2", "sys_fis102", "sys_fis101", DependencyType.PREREQUISITO),
    ("dep_3", "sys_inf102", "sys_inf101", DependencyType.PREREQUISITO),
    ("dep_4", "sys_inf201", "sys_inf102", DependencyType.PREREQUISITO),
    ("dep_5", "sys_inf202", "sys_inf201", DependencyType.PREREQUISITO),
    ("dep_6", "sys_est201", "sys_mat102", DependencyType.PREREQUISITO),
    ("dep_7", "sys_inf303", "sys_inf203", DependencyType.PREREQUISITO),
    ("dep_8", "sys_inf301", "sys_inf202", DependencyType.PREREQUISITO),
    ("dep_9", "sys_elec310", "sys_inf201", DependencyType.PREREQUISITO),
    ("dep_10", "sys_elec320", "sys_inf302", DependencyType.PREREQUISITO),
    ("dep_11", "sys_inf401", "sys_inf301", DependencyType.PREREQUISITO),
    ("dep_12", "sys_inf401", "sys_inv400", DependencyType.CORREQUISITO),
    ("dep_13", "adm_eco102", "adm_eco101", DependencyType.PREREQUISITO),
    ("dep_14", "adm_con102", "adm_con101", DependencyType.PREREQUISITO),
    ("dep_15", "adm_adm203", "adm_est201", DependencyType.PREREQUISITO),
    ("dep_16", "adm_adm301", "adm_con102", DependencyType.PREREQUISITO),
    ("dep_17", "adm_adm302", "adm_adm201", DependencyType.PREREQUISITO),
    ("dep_18", "adm_adm401", "adm_adm302", DependencyType.PREREQUISITO),
    ("dep_19", "adm_adm402", "adm_est201", DependencyType.PREREQUISITO),
    ("dep_20", "adm_adm499", "adm_adm401", DependencyType.PREREQUISITO),
    ("dep_21", "adm_adm499", "adm_inv400", DependencyType.CORREQUISITO),
]

HISTORIES = [
    ("student_1", "sys_mat101", CourseStatus.APROBADA, 1),
    ("student_1", "sys_mat201", CourseStatus.APROBADA, 1),
    ("student_1", "sys_inf101", CourseStatus.APROBADA, 1),
    ("student_1", "sys_hum101", CourseStatus.APROBADA, 1),
    ("student_1", "sys_fis101", CourseStatus.APROBADA, 2),
    ("student_1", "sys_mat102", CourseStatus.APROBADA, 2),
    ("student_1", "sys_inf102", CourseStatus.EN_CURSO, 6),
    ("student_1", "sys_hum102", CourseStatus.APROBADA, 2),
    ("student_1", "sys_fis102", CourseStatus.APROBADA, 3),
    ("student_1", "sys_inf203", CourseStatus.APROBADA, 3),
    ("student_1", "sys_est201", CourseStatus.APROBADA, 3),
    ("student_1", "sys_inf201", CourseStatus.DISPONIBLE, None),
    ("student_1", "sys_inf202", CourseStatus.BLOQUEADA, None),
    ("student_1", "sys_inf301", CourseStatus.BLOQUEADA, None),
    ("student_1", "sys_inf302", CourseStatus.DISPONIBLE, None),
    ("student_1", "sys_inf303", CourseStatus.DISPONIBLE, None),
    ("student_1", "sys_eco210", CourseStatus.DISPONIBLE, None),
    ("student_1", "sys_adm100", CourseStatus.APROBADA, 4),
    ("student_1", "sys_elec310", CourseStatus.BLOQUEADA, None),
    ("student_1", "sys_elec320", CourseStatus.BLOQUEADA, None),
    ("student_1", "sys_inv400", CourseStatus.PENDIENTE, None),
    ("student_1", "sys_inf401", CourseStatus.BLOQUEADA, None),
    ("student_1", "adm_adm101", CourseStatus.APROBADA, 1),
    ("student_1", "adm_mat101", CourseStatus.APROBADA, 1),
    ("student_1", "adm_hum101", CourseStatus.APROBADA, 1),
    ("student_1", "adm_est201", CourseStatus.APROBADA, 3),
    ("student_1", "adm_eco101", CourseStatus.APROBADA, 2),
    ("student_1", "adm_con101", CourseStatus.APROBADA, 2),
    ("student_1", "adm_hum102", CourseStatus.APROBADA, 2),
    ("student_1", "adm_eco102", CourseStatus.EN_CURSO, 6),
    ("student_1", "adm_con102", CourseStatus.DISPONIBLE, None),
    ("student_1", "adm_adm201", CourseStatus.DISPONIBLE, None),
    ("student_1", "adm_adm202", CourseStatus.DISPONIBLE, None),
    ("student_1", "adm_der101", CourseStatus.DISPONIBLE, None),
    ("student_1", "adm_adm203", CourseStatus.BLOQUEADA, None),
    ("student_1", "adm_adm301", CourseStatus.BLOQUEADA, None),
    ("student_1", "adm_adm302", CourseStatus.BLOQUEADA, None),
    ("student_1", "adm_adm303", CourseStatus.DISPONIBLE, None),
    ("student_1", "adm_adm401", CourseStatus.BLOQUEADA, None),
    ("student_1", "adm_adm402", CourseStatus.BLOQUEADA, None),
    ("student_1", "adm_inv400", CourseStatus.PENDIENTE, None),
    ("student_1", "adm_adm499", CourseStatus.BLOQUEADA, None),
    ("student_2", "sys_mat101", CourseStatus.APROBADA, 1),
    ("student_2", "sys_mat201", CourseStatus.APROBADA, 1),
    ("student_2", "sys_inf101", CourseStatus.APROBADA, 1),
    ("student_2", "sys_hum101", CourseStatus.APROBADA, 1),
    ("student_2", "sys_fis101", CourseStatus.APROBADA, 2),
    ("student_2", "sys_mat102", CourseStatus.REPROBADA, 2),
    ("student_2", "sys_inf102", CourseStatus.DISPONIBLE, None),
    ("student_2", "sys_hum102", CourseStatus.APROBADA, 2),
    ("student_2", "sys_fis102", CourseStatus.DISPONIBLE, None),
    ("student_2", "sys_inf203", CourseStatus.DISPONIBLE, None),
    ("student_2", "sys_est201", CourseStatus.BLOQUEADA, None),
    ("student_2", "sys_inf201", CourseStatus.BLOQUEADA, None),
    ("student_2", "sys_inf202", CourseStatus.BLOQUEADA, None),
    ("student_2", "sys_inf301", CourseStatus.BLOQUEADA, None),
    ("student_2", "sys_inf302", CourseStatus.BLOQUEADA, None),
    ("student_2", "sys_inf303", CourseStatus.BLOQUEADA, None),
    ("student_2", "sys_eco210", CourseStatus.DISPONIBLE, None),
    ("student_2", "sys_adm100", CourseStatus.DISPONIBLE, None),
    ("student_2", "sys_elec310", CourseStatus.BLOQUEADA, None),
    ("student_2", "sys_elec320", CourseStatus.BLOQUEADA, None),
    ("student_2", "sys_inv400", CourseStatus.PENDIENTE, None),
    ("student_2", "sys_inf401", CourseStatus.BLOQUEADA, None),
]

SCENARIOS = [
    (
        "scenario_1",
        "student_1",
        "Recuperar Programación II",
        "Pérdida simulada de Programación II con recuperación intensiva.",
        datetime.fromisoformat("2026-05-01T10:00:00+00:00"),
    ),
    (
        "scenario_2",
        "student_1",
        "Ruta balanceada semestre 7",
        "Aplazamiento de Redes para equilibrar carga académica.",
        datetime.fromisoformat("2026-05-04T10:00:00+00:00"),
    ),
    (
        "scenario_3",
        "student_1",
        "Cancelar electiva",
        "Cancelación simulada de Seguridad Informática.",
        datetime.fromisoformat("2026-05-08T10:00:00+00:00"),
    ),
]

SCENARIO_EVENTS = [
    ("event_1", "scenario_1", "sys_inf102", ScenarioEventType.PERDIDA),
    ("event_2", "scenario_2", "sys_inf302", ScenarioEventType.APLAZAMIENTO),
    ("event_3", "scenario_3", "sys_elec320", ScenarioEventType.CANCELACION),
]

SCENARIO_RESULTS = [
    ("result_1", "scenario_1", "sys_inf102", CourseStatus.REPROBADA),
    ("result_2", "scenario_1", "sys_inf201", CourseStatus.BLOQUEADA),
    ("result_3", "scenario_1", "sys_inf202", CourseStatus.BLOQUEADA),
    ("result_4", "scenario_1", "sys_inf301", CourseStatus.BLOQUEADA),
    ("result_5", "scenario_1", "sys_inf401", CourseStatus.BLOQUEADA),
    ("result_6", "scenario_2", "sys_inf302", CourseStatus.PENDIENTE),
    ("result_7", "scenario_3", "sys_elec320", CourseStatus.PENDIENTE),
]

ROUTES = [
    (
        "route_1",
        "scenario_1",
        "Ruta acelerada",
        1,
        9,
        3,
        Difficulty.ALTA,
        Workload.ALTA,
        "Recupera Programación II de inmediato y mantiene la cadena crítica activa.",
    ),
    (
        "route_2",
        "scenario_1",
        "Ruta balanceada",
        2,
        10,
        4,
        Difficulty.MEDIA,
        Workload.MEDIA,
        "Distribuye la recuperación de la materia y evita picos de carga.",
    ),
    (
        "route_3",
        "scenario_1",
        "Ruta pausada",
        3,
        11,
        5,
        Difficulty.BAJA,
        Workload.BAJA,
        "Prioriza estabilidad académica con menor carga por semestre.",
    ),
    (
        "route_4",
        "scenario_2",
        "Ruta balanceada",
        1,
        9,
        3,
        Difficulty.MEDIA,
        Workload.MEDIA,
        "Mueve Redes sin alterar la línea crítica de graduación.",
    ),
    (
        "route_5",
        "scenario_3",
        "Ruta pausada",
        1,
        9,
        3,
        Difficulty.BAJA,
        Workload.BAJA,
        "Reubica una electiva sin comprometer materias núcleo.",
    ),
]

ROUTE_STEPS = [
    ("step_1", "route_1", "sys_inf102", 6, 1),
    ("step_2", "route_1", "sys_inf201", 7, 2),
    ("step_3", "route_1", "sys_inf202", 7, 3),
    ("step_4", "route_1", "sys_inf301", 8, 4),
    ("step_5", "route_1", "sys_inf401", 9, 5),
    ("step_6", "route_2", "sys_inf102", 7, 1),
    ("step_7", "route_2", "sys_inf201", 8, 2),
    ("step_8", "route_2", "sys_inf202", 8, 3),
    ("step_9", "route_2", "sys_inf301", 9, 4),
    ("step_10", "route_2", "sys_inf401", 10, 5),
    ("step_11", "route_3", "sys_inf102", 7, 1),
    ("step_12", "route_3", "sys_inf201", 8, 2),
    ("step_13", "route_3", "sys_inf202", 9, 3),
    ("step_14", "route_3", "sys_inf301", 10, 4),
    ("step_15", "route_3", "sys_inf401", 11, 5),
]

DOCUMENTS = [
    {
        "id": "doc_1",
        "programa_id": "prog_systems",
        "nombre_archivo": "malla_ingenieria_sistemas_2025.pdf",
        "tipo_archivo": "application/pdf",
        "estado_procesamiento": DocumentProcessingStatus.CONVERTIDO_A_GRAFO,
        "porcentaje_progreso": 100,
        "fecha_carga": datetime.fromisoformat("2026-05-09T09:00:00+00:00"),
    },
]

EXTRACTIONS = [
    {
        "id": "extract_1",
        "documento_malla_id": "doc_1",
        "texto_extraido": (
            "MAT101 Cálculo Diferencial 4 créditos. MAT102 Cálculo Integral 4 créditos. "
            "INF101 Programación I 4 créditos. INF102 Programación II 4 créditos. "
            "INF201 Estructuras de Datos 4 créditos. INF202 Bases de Datos 4 créditos."
        ),
        "metodo_extraccion": ExtractionMethod.MIXTO,
        "confianza_ocr": 0.94,
        "fecha_procesamiento": datetime.fromisoformat("2026-05-09T09:03:00+00:00"),
    },
]

CHUNKS = [
    {
        "id": "chunk_1",
        "documento_malla_id": "doc_1",
        "contenido": "Bloque matemático: MAT101, MAT102, MAT201, EST201.",
        "orden": 1,
        "fuente": "Página 1",
    },
    {
        "id": "chunk_2",
        "documento_malla_id": "doc_1",
        "contenido": "Cadena de programación: INF101 -> INF102 -> INF201 -> INF202 -> INF301.",
        "orden": 2,
        "fuente": "Página 2",
    },
]

CHAT_SESSIONS = [
    {
        "id": "chat_1",
        "estudiante_id": "student_1",
        "titulo": "Planeación semestre 7",
        "fecha_inicio": datetime.fromisoformat("2026-05-10T14:30:00+00:00"),
    },
]

CHAT_MESSAGES = [
    {
        "id": "msg_1",
        "chat_sesion_id": "chat_1",
        "emisor": ChatSender.USUARIO,
        "mensaje": "¿Qué materias puedo cursar el próximo semestre?",
        "fecha": datetime.fromisoformat("2026-05-10T14:30:00+00:00"),
        "fuentes_opcionales": None,
    },
    {
        "id": "msg_2",
        "chat_sesion_id": "chat_1",
        "emisor": ChatSender.ASISTENTE,
        "mensaje": (
            "Con base en tu historial y la malla activa, puedes cursar Estructuras de Datos, "
            "Redes de Computadores, Sistemas Operativos y Economía para Ingenieros. "
            "La recomendación prioriza materias que abren nuevas dependencias."
        ),
        "fecha": datetime.fromisoformat("2026-05-10T14:30:06+00:00"),
        "fuentes_opcionales": '["grafo curricular", "historial académico", "documento PDF procesado"]',
    },
]

RAG_QUERIES = [
    {
        "id": "rag_1",
        "chat_mensaje_id": "msg_2",
        "pregunta": "¿Qué materias puedo cursar el próximo semestre?",
        "contexto_recuperado": (
            "INF102 aprobada/en curso desbloquea INF201. INF203 aprobada habilita INF303. "
            "Historial del estudiante indica MAT102 e INF203 aprobadas."
        ),
        "fuentes_consultadas": '["grafo curricular", "historial académico", "documento PDF procesado"]',
        "modelo_local": LocalModel.GEMMA,
    },
]


def seed_database(db: Session) -> None:
    if db.query(User).first():
        if not db.query(AdminActivity).first():
            db.add_all([AdminActivity(**item) for item in ADMIN_ACTIVITIES])
            db.commit()
        return

    db.add_all(
        [
            User(**item, password_hash=hash_password("demo123"))
            for item in USERS
        ],
    )
    db.add_all([Student(**item) for item in STUDENTS])
    db.add_all([Program(**item) for item in PROGRAMS])
    db.add_all([CurriculumVersion(**item) for item in VERSIONS])
    db.add_all([ProgramEnrollment(**item) for item in ENROLLMENTS])
    db.add_all(
        [
            Course(
                id=id_,
                version_malla_id=version_id,
                codigo=codigo,
                nombre=nombre,
                creditos=creditos,
                semestre_sugerido=semestre,
                electiva=electiva,
            )
            for id_, version_id, codigo, nombre, creditos, semestre, electiva in COURSES
        ],
    )
    db.add_all(
        [
            CourseDependency(
                id=id_,
                materia_id=materia_id,
                materia_requerida_id=requerida_id,
                tipo=tipo,
            )
            for id_, materia_id, requerida_id, tipo in DEPENDENCIES
        ],
    )
    db.add_all(
        [
            AcademicHistory(
                id=f"history_{index}",
                estudiante_id=student_id,
                materia_id=course_id,
                estado=status,
                semestre_cursado=semester,
                actualizado_en=NOW,
            )
            for index, (student_id, course_id, status, semester) in enumerate(HISTORIES, start=1)
        ],
    )
    db.add_all(
        [
            Scenario(
                id=id_,
                estudiante_id=student_id,
                nombre=nombre,
                descripcion=descripcion,
                creado_en=created_at,
                actualizado_en=created_at,
            )
            for id_, student_id, nombre, descripcion, created_at in SCENARIOS
        ],
    )
    db.add_all(
        [
            ScenarioEvent(
                id=id_,
                escenario_id=scenario_id,
                materia_id=course_id,
                tipo_evento=event_type,
            )
            for id_, scenario_id, course_id, event_type in SCENARIO_EVENTS
        ],
    )
    db.add_all(
        [
            ScenarioResult(
                id=id_,
                escenario_id=scenario_id,
                materia_id=course_id,
                estado_simulado=status,
            )
            for id_, scenario_id, course_id, status in SCENARIO_RESULTS
        ],
    )
    db.add_all(
        [
            SuggestedRoute(
                id=id_,
                escenario_id=scenario_id,
                nombre=nombre,
                orden=order,
                semestre_estimado_graduacion=graduation_semester,
                duracion_estimada=duration,
                dificultad=difficulty,
                carga_trabajo=workload,
                descripcion=description,
            )
            for (
                id_,
                scenario_id,
                nombre,
                order,
                graduation_semester,
                duration,
                difficulty,
                workload,
                description,
            ) in ROUTES
        ],
    )
    db.add_all(
        [
            RouteStep(
                id=id_,
                ruta_id=route_id,
                materia_id=course_id,
                semestre_sugerido=semester,
                orden=order,
            )
            for id_, route_id, course_id, semester, order in ROUTE_STEPS
        ],
    )
    db.add_all([CurriculumDocument(**item) for item in DOCUMENTS])
    db.add_all([DocumentExtraction(**item) for item in EXTRACTIONS])
    db.add_all([DocumentChunk(**item) for item in CHUNKS])
    db.add_all([ChatSession(**item) for item in CHAT_SESSIONS])
    db.add_all([ChatMessage(**item) for item in CHAT_MESSAGES])
    db.add_all([RagQuery(**item) for item in RAG_QUERIES])
    db.add_all([AdminActivity(**item) for item in ADMIN_ACTIVITIES])
    db.commit()
