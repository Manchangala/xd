from datetime import datetime, timezone
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import (
    AcademicHistory,
    Course,
    CourseDependency,
    CurriculumVersion,
    Program,
    ProgramEnrollment,
    Student,
    User,
)
from app.models.enums import CourseStatus, DependencyType
from app.schemas.curriculum import (
    CourseResponse,
    CourseWithStateResponse,
    CurriculumGraphResponse,
    DoubleProgramResponse,
    DoubleProgramUnitResponse,
    HistoryResponse,
    ProgressSummaryResponse,
    ProgramEnrollmentResponse,
    ProgramResponse,
    StudentDirectoryItemResponse,
    StudentProfileResponse,
    StudentResponse,
)
from app.schemas.auth import UserResponse
from uuid import uuid4


def get_program_or_404(db: Session, program_id: str) -> Program:
    program = db.get(Program, program_id)
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no encontrado")
    return program


def get_primary_program_id(db: Session, student_id: str) -> str:
    enrollment = db.scalar(
        select(ProgramEnrollment).where(
            ProgramEnrollment.estudiante_id == student_id,
            ProgramEnrollment.es_principal.is_(True),
        ),
    )
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programa principal no encontrado",
        )
    return enrollment.programa_id


def get_active_version_or_404(db: Session, program_id: str) -> CurriculumVersion:
    version = db.scalar(
        select(CurriculumVersion).where(
            CurriculumVersion.programa_id == program_id,
            CurriculumVersion.activa.is_(True),
        ),
    )
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una versión activa de la malla",
        )
    return version


def get_courses_for_version(db: Session, version_id: str) -> list[Course]:
    return list(db.scalars(select(Course).where(Course.version_malla_id == version_id)))


def get_dependencies_for_courses(db: Session, course_ids: set[str]) -> list[CourseDependency]:
    return list(
        db.scalars(
            select(CourseDependency).where(
                CourseDependency.materia_id.in_(course_ids),
                CourseDependency.materia_requerida_id.in_(course_ids),
            ),
        ),
    )


def get_histories_for_courses(
    db: Session,
    student_id: str,
    course_ids: set[str],
) -> list[AcademicHistory]:
    return list(
        db.scalars(
            select(AcademicHistory).where(
                AcademicHistory.estudiante_id == student_id,
                AcademicHistory.materia_id.in_(course_ids),
            ),
        ),
    )


def obtener_prerequisitos(materia_id: str, dependencies: list[CourseDependency]) -> list[str]:
    return [
        dependency.materia_requerida_id
        for dependency in dependencies
        if dependency.materia_id == materia_id and dependency.tipo == DependencyType.PREREQUISITO
    ]


def obtener_correquisitos(materia_id: str, dependencies: list[CourseDependency]) -> list[str]:
    return [
        dependency.materia_requerida_id
        for dependency in dependencies
        if dependency.materia_id == materia_id and dependency.tipo == DependencyType.CORREQUISITO
    ]


def obtener_dependientes(materia_id: str, dependencies: list[CourseDependency]) -> list[str]:
    return [
        dependency.materia_id
        for dependency in dependencies
        if dependency.materia_requerida_id == materia_id
    ]


def get_explicit_status(
    histories: list[AcademicHistory] | list[HistoryResponse],
    materia_id: str,
) -> CourseStatus | None:
    history = next((item for item in histories if item.materia_id == materia_id), None)
    return history.estado if history else None


def derive_course_status(
    materia_id: str,
    histories: list[AcademicHistory] | list[HistoryResponse],
    dependencies: list[CourseDependency],
) -> CourseStatus:
    explicit = get_explicit_status(histories, materia_id)
    if explicit in {
        CourseStatus.APROBADA,
        CourseStatus.EN_CURSO,
        CourseStatus.REPROBADA,
    }:
        return explicit

    prerequisitos = obtener_prerequisitos(materia_id, dependencies)
    all_approved = all(
        get_explicit_status(histories, prereq_id) == CourseStatus.APROBADA
        for prereq_id in prerequisitos
    )
    return CourseStatus.DISPONIBLE if all_approved else CourseStatus.BLOQUEADA


def build_courses_with_state(
    courses: list[Course],
    dependencies: list[CourseDependency],
    histories: list[AcademicHistory] | list[HistoryResponse],
) -> list[CourseWithStateResponse]:
    courses_by_id = {course.id: course for course in courses}
    results: list[CourseWithStateResponse] = []

    for course in courses:
        prereq_ids = obtener_prerequisitos(course.id, dependencies)
        coreq_ids = obtener_correquisitos(course.id, dependencies)
        dependent_ids = obtener_dependientes(course.id, dependencies)
        results.append(
            CourseWithStateResponse(
                **CourseResponse.model_validate(course).model_dump(),
                estado=derive_course_status(course.id, histories, dependencies),
                prerequisitos=[
                    CourseResponse.model_validate(courses_by_id[item])
                    for item in prereq_ids
                    if item in courses_by_id
                ],
                correquisitos=[
                    CourseResponse.model_validate(courses_by_id[item])
                    for item in coreq_ids
                    if item in courses_by_id
                ],
                dependientes=[
                    CourseResponse.model_validate(courses_by_id[item])
                    for item in dependent_ids
                    if item in courses_by_id
                ],
            ),
        )
    return results


def get_curriculum_graph(
    db: Session,
    program_id: str,
    student_id: str,
) -> CurriculumGraphResponse:
    program = get_program_or_404(db, program_id)
    version = get_active_version_or_404(db, program_id)
    courses = get_courses_for_version(db, version.id)
    course_ids = {course.id for course in courses}
    dependencies = get_dependencies_for_courses(db, course_ids)
    histories = get_histories_for_courses(db, student_id, course_ids)
    return CurriculumGraphResponse(
        programa=program,
        version=version,
        materias=build_courses_with_state(courses, dependencies, histories),
        dependencias=dependencies,
    )


def build_progress_by_semester(
    student: Student,
    courses: list[Course],
    histories: list[AcademicHistory],
) -> list[dict[str, int | str]]:
    courses_by_id = {course.id: course for course in courses}
    approved_by_semester: dict[int, int] = {}

    for history in histories:
        if history.estado != CourseStatus.APROBADA:
            continue
        course = courses_by_id.get(history.materia_id)
        if not course:
            continue
        semester = history.semestre_cursado or course.semestre_sugerido
        approved_by_semester[semester] = approved_by_semester.get(semester, 0) + course.creditos

    last_semester = max([student.semestre_actual, *approved_by_semester.keys(), 1])
    return [
        {"semestre": f"S{semester}", "aprobados": approved_by_semester.get(semester, 0)}
        for semester in range(1, last_semester + 1)
    ]


def calculate_progress_summary(
    student: Student,
    program: Program,
    courses: list[Course],
    dependencies: list[CourseDependency],
    histories: list[AcademicHistory],
) -> ProgressSummaryResponse:
    with_state = build_courses_with_state(courses, dependencies, histories)
    approved_ids = {
        history.materia_id for history in histories if history.estado == CourseStatus.APROBADA
    }
    creditos_aprobados = sum(course.creditos for course in courses if course.id in approved_ids)
    promedio_acumulado = 4.12 if creditos_aprobados > 0 else None
    porcentaje_avance = (creditos_aprobados / program.total_creditos) * 100
    aprobadas = sum(1 for course in with_state if course.estado == CourseStatus.APROBADA)
    en_curso = sum(1 for course in with_state if course.estado == CourseStatus.EN_CURSO)
    bloqueadas = sum(1 for course in with_state if course.estado == CourseStatus.BLOQUEADA)
    disponibles = [course for course in with_state if course.estado == CourseStatus.DISPONIBLE]
    semestres_restantes_estimados = estimate_remaining_semesters(
        courses,
        dependencies,
        histories,
        student.carga_maxima_creditos,
        program.total_creditos,
    )
    semestre_estimado_graduacion = student.semestre_actual + max(
        semestres_restantes_estimados - 1,
        0,
    )
    alertas = [
        (
            f"{bloqueadas} materias siguen bloqueadas por prerrequisitos pendientes."
            if bloqueadas > 4
            else "Tu cadena crítica está bajo control."
        ),
        (
            f"{en_curso} materia(s) en curso pueden desbloquear nuevas rutas al cierre del semestre."
            if en_curso > 0
            else "No registras materias en curso actualmente."
        ),
    ]
    return ProgressSummaryResponse(
        total_creditos=program.total_creditos,
        creditos_aprobados=creditos_aprobados,
        porcentaje_avance=porcentaje_avance,
        promedio_acumulado=promedio_acumulado,
        aprobadas=aprobadas,
        en_curso=en_curso,
        bloqueadas=bloqueadas,
        semestre_estimado_graduacion=semestre_estimado_graduacion,
        semestres_restantes_estimados=semestres_restantes_estimados,
        carga_maxima_creditos=student.carga_maxima_creditos,
        disponibles_proximo_semestre=disponibles[:6],
        avance_por_semestre=build_progress_by_semester(student, courses, histories),
        alertas=alertas,
    )


def get_progress_summary(db: Session, student_id: str, program_id: str) -> ProgressSummaryResponse:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")
    program = get_program_or_404(db, program_id)
    version = get_active_version_or_404(db, program_id)
    courses = get_courses_for_version(db, version.id)
    course_ids = {course.id for course in courses}
    dependencies = get_dependencies_for_courses(db, course_ids)
    histories = get_histories_for_courses(db, student_id, course_ids)
    return calculate_progress_summary(student, program, courses, dependencies, histories)


def update_history_status(
    db: Session,
    student_id: str,
    course_id: str,
    new_status: CourseStatus,
    semester_taken: int | None,
) -> AcademicHistory:
    history = db.scalar(
        select(AcademicHistory).where(
            AcademicHistory.estudiante_id == student_id,
            AcademicHistory.materia_id == course_id,
        ),
    )
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de historial no encontrado",
        )

    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")

    sibling_courses = get_courses_for_version(db, course.version_malla_id)
    sibling_ids = {item.id for item in sibling_courses}
    dependencies = get_dependencies_for_courses(db, sibling_ids)
    histories = get_histories_for_courses(db, student_id, sibling_ids)

    if new_status == CourseStatus.APROBADA:
        missing_prereqs = [
            prereq_id
            for prereq_id in obtener_prerequisitos(course_id, dependencies)
            if get_explicit_status(histories, prereq_id) != CourseStatus.APROBADA
        ]
        if missing_prereqs:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={
                    "message": "No se puede aprobar la materia con prerrequisitos incompletos",
                    "prerequisitosFaltantes": missing_prereqs,
                },
            )

    history.estado = new_status
    history.semestre_cursado = semester_taken
    history.actualizado_en = datetime.now(timezone.utc)
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def estimate_remaining_semesters(
    courses: list[Course],
    dependencies: list[CourseDependency],
    histories: list[AcademicHistory],
    max_credits: int,
    total_program_credits: int,
) -> int:
    initial_approved_ids = {
        history.materia_id
        for history in histories
        if history.estado in {CourseStatus.APROBADA, CourseStatus.EN_CURSO}
    }
    approved_ids = set(initial_approved_ids)
    remaining_ids = {course.id for course in courses if course.id not in approved_ids}
    course_by_id = {course.id: course for course in courses}
    dependents_count = {
        course.id: len(obtener_dependientes(course.id, dependencies))
        for course in courses
    }
    semesters = 0

    while remaining_ids:
        available = [
            course_by_id[course_id]
            for course_id in remaining_ids
            if all(
                prereq_id in approved_ids
                for prereq_id in obtener_prerequisitos(course_id, dependencies)
            )
        ]
        if not available:
            return semesters + len(remaining_ids)

        available.sort(
            key=lambda course: (
                course.semestre_sugerido,
                -dependents_count[course.id],
                course.codigo,
            ),
        )
        selected: list[Course] = []
        used_credits = 0
        for course in available:
            if used_credits + course.creditos <= max_credits or not selected:
                selected.append(course)
                used_credits += course.creditos
        selected_ids = {course.id for course in selected}
        approved_ids.update(selected_ids)
        remaining_ids.difference_update(selected_ids)
        semesters += 1

    approved_credits = sum(
        course.creditos for course in courses if course.id in initial_approved_ids
    )
    remaining_credits_by_program = max(total_program_credits - approved_credits, 0)
    remaining_credits_by_catalog = sum(
        course.creditos for course in courses if course.id not in initial_approved_ids
    )
    safe_max_credits = max(max_credits, 1)
    semesters_by_credit_load = ceil(
        max(remaining_credits_by_program, remaining_credits_by_catalog) / safe_max_credits
    )

    return max(semesters, semesters_by_credit_load)


def _initialize_histories_for_program(db: Session, student_id: str, program_id: str) -> None:
    version = get_active_version_or_404(db, program_id)
    courses = get_courses_for_version(db, version.id)
    existing_course_ids = {
        history.materia_id
        for history in db.scalars(
            select(AcademicHistory).where(AcademicHistory.estudiante_id == student_id),
        )
    }
    for course in courses:
        if course.id not in existing_course_ids:
            db.add(
                AcademicHistory(
                    id=f"history_{uuid4().hex[:12]}",
                    estudiante_id=student_id,
                    materia_id=course.id,
                    estado=CourseStatus.PENDIENTE,
                ),
            )


def replace_student_programs(
    db: Session,
    student_id: str,
    primary_program_id: str,
    secondary_program_id: str | None = None,
    *,
    commit: bool = True,
) -> StudentProfileResponse:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")
    if secondary_program_id and secondary_program_id == primary_program_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El programa principal y el secundario deben ser distintos",
        )
    program_ids = [primary_program_id, *([secondary_program_id] if secondary_program_id else [])]
    programs = [get_program_or_404(db, program_id) for program_id in program_ids]
    if any(not program.activo for program in programs):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Solo puedes seleccionar programas activos",
        )

    current = list(
        db.scalars(
            select(ProgramEnrollment).where(ProgramEnrollment.estudiante_id == student_id),
        ),
    )
    current_by_program = {enrollment.programa_id: enrollment for enrollment in current}
    for enrollment in current:
        if enrollment.programa_id not in program_ids:
            db.delete(enrollment)
    for program_id in program_ids:
        enrollment = current_by_program.get(program_id)
        if enrollment is None:
            enrollment = ProgramEnrollment(
                id=f"enroll_{uuid4().hex[:12]}",
                estudiante_id=student_id,
                programa_id=program_id,
                es_principal=program_id == primary_program_id,
            )
        else:
            enrollment.es_principal = program_id == primary_program_id
        db.add(enrollment)
        _initialize_histories_for_program(db, student_id, program_id)

    if commit:
        db.commit()
    return get_student_profile(db, student_id)


def get_double_program_overview(db: Session, student_id: str) -> DoubleProgramResponse:
    enrollments = list(
        db.scalars(
            select(ProgramEnrollment).where(ProgramEnrollment.estudiante_id == student_id),
        ),
    )
    principal_enrollment = next((item for item in enrollments if item.es_principal), None)
    if not principal_enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programa principal no encontrado",
        )
    secondary_enrollment = next((item for item in enrollments if not item.es_principal), None)

    principal_program = get_program_or_404(db, principal_enrollment.programa_id)
    secondary_program = (
        get_program_or_404(db, secondary_enrollment.programa_id)
        if secondary_enrollment
        else None
    )

    principal_progress = get_progress_summary(db, student_id, principal_program.id)
    secondary_progress = (
        get_progress_summary(db, student_id, secondary_program.id)
        if secondary_program
        else None
    )

    principal_version = get_active_version_or_404(db, principal_program.id)
    principal_codes = {
        course.codigo for course in get_courses_for_version(db, principal_version.id)
    }
    shared_codes: list[str] = []
    if secondary_program:
        secondary_version = get_active_version_or_404(db, secondary_program.id)
        shared_codes = [
            course.codigo
            for course in get_courses_for_version(db, secondary_version.id)
            if course.codigo in principal_codes
        ]

    return DoubleProgramResponse(
        principal=DoubleProgramUnitResponse(
            programa=principal_program,
            progreso=principal_progress,
        ),
        secundario=(
            DoubleProgramUnitResponse(programa=secondary_program, progreso=secondary_progress)
            if secondary_program and secondary_progress
            else None
        ),
        materias_compartidas=shared_codes,
    )


def get_student_profile(db: Session, student_id: str) -> StudentProfileResponse:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")
    user = db.get(User, student.usuario_id)
    enrollments = list(
        db.scalars(
            select(ProgramEnrollment).where(ProgramEnrollment.estudiante_id == student_id),
        ),
    )
    programs = [
        program
        for program in (db.get(Program, enrollment.programa_id) for enrollment in enrollments)
        if program is not None
    ]
    return StudentProfileResponse(
        student=StudentResponse.model_validate(student),
        user=UserResponse.model_validate(user),
        enrollments=[ProgramEnrollmentResponse.model_validate(item) for item in enrollments],
        programs=[ProgramResponse.model_validate(item) for item in programs],
    )


def list_student_directory(db: Session) -> list[StudentDirectoryItemResponse]:
    rows = db.execute(
        select(Student, User)
        .join(User, Student.usuario_id == User.id)
        .order_by(User.nombre),
    ).all()
    return [
        StudentDirectoryItemResponse(
            student=StudentResponse.model_validate(student),
            user=UserResponse.model_validate(user),
        )
        for student, user in rows
    ]


def update_student_profile(
    db: Session,
    student_id: str,
    semestre_actual: int | None,
    carga_maxima_creditos: int | None,
) -> StudentResponse:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")
    if semestre_actual is not None:
        student.semestre_actual = semestre_actual
    if carga_maxima_creditos is not None:
        student.carga_maxima_creditos = carga_maxima_creditos
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentResponse.model_validate(student)
