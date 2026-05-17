from uuid import uuid4

import base64
import pymupdf
from fastapi.testclient import TestClient

from app.db.init_db import init_db
from app.main import app

init_db()
client = TestClient(app)


def _login(email: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "demo123"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def test_healthcheck() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["environment"]
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_readiness_check_validates_database() -> None:
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}


def test_login_returns_token_and_student_id() -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "estudiante@curriculapath.edu", "password": "demo123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["tokenType"] == "bearer"
    assert payload["studentId"] == "student_1"
    assert payload["user"]["rol"] == "student"
    assert payload["accessToken"]


def test_curriculum_graph_and_simulation_flow() -> None:
    headers = _login("estudiante@curriculapath.edu")
    graph = client.get(
        "/api/v1/curriculums/prog_systems/graph",
        params={"student_id": "student_1"},
        headers=headers,
    )
    assert graph.status_code == 200
    graph_payload = graph.json()
    assert graph_payload["programa"]["id"] == "prog_systems"
    assert len(graph_payload["materias"]) >= 20

    simulation = client.post(
        "/api/v1/simulation/failure",
        json={"studentId": "student_1", "courseId": "sys_inf102"},
        headers=headers,
    )
    assert simulation.status_code == 200
    simulation_payload = simulation.json()
    assert "sys_inf201" in simulation_payload["materiasBloqueadas"]
    assert simulation_payload["evento"]["tipoEvento"] == "perdida"


def test_history_patch_rejects_incomplete_prerequisites() -> None:
    response = client.patch(
        "/api/v1/students/student_2/history/sys_est201",
        json={"estado": "aprobada"},
        headers=_login("admin@curriculapath.edu"),
    )
    assert response.status_code == 422
    assert "prerequisitosFaltantes" in response.json()["detail"]


def test_scenarios_list_is_serializable() -> None:
    response = client.get(
        "/api/v1/students/student_1/scenarios",
        headers=_login("estudiante@curriculapath.edu"),
    )
    assert response.status_code == 200
    assert response.json()[0]["escenario"]["creadoEn"]


def test_admin_pdf_and_chat_flows() -> None:
    admin_headers = _login("admin@curriculapath.edu")
    student_headers = _login("estudiante@curriculapath.edu")

    overview = client.get("/api/v1/admin/overview", headers=admin_headers)
    assert overview.status_code == 200
    assert overview.json()["programas"] == 2

    system_status = client.get("/api/v1/admin/system-status", headers=admin_headers)
    assert system_status.status_code == 200
    check_ids = {check["id"] for check in system_status.json()["checks"]}
    assert {"api", "database", "ocr", "llm", "security", "configuration"} <= check_ids

    ocr_status = client.get("/api/v1/admin/ocr/status", headers=admin_headers)
    assert ocr_status.status_code == 200
    assert "available" in ocr_status.json()
    assert "readyForScannedPdfs" in ocr_status.json()
    assert "nextSteps" in ocr_status.json()

    blank_pdf = pymupdf.open()
    blank_pdf.new_page()
    blank_pdf_bytes = blank_pdf.tobytes()
    blank_pdf.close()

    upload = client.post(
        "/api/v1/admin/curriculum-documents/upload",
        data={"program_id": "prog_systems"},
        files={"file": ("malla-imagen.pdf", blank_pdf_bytes, "application/pdf")},
        headers=admin_headers,
    )
    assert upload.status_code == 200
    document_id = upload.json()["id"]

    processed = client.post(
        f"/api/v1/admin/curriculum-documents/{document_id}/process",
        headers=admin_headers,
    )
    assert processed.status_code == 200
    assert processed.json()["extraction"]["textoExtraido"] == ""
    assert processed.json()["document"]["estadoProcesamiento"] == "error"
    assert processed.json()["diagnostics"]["recommendedAction"] == "manual_review"
    assert processed.json()["diagnostics"]["pagesWithoutText"] == 1

    sessions = client.get(
        "/api/v1/chat/sessions",
        params={"student_id": "student_1"},
        headers=student_headers,
    )
    assert sessions.status_code == 200
    assert sessions.json()
    session_id = sessions.json()[0]["id"]

    chat = client.post(
        f"/api/v1/chat/sessions/{session_id}/messages",
        json={"mensaje": "¿Cuántos créditos me faltan?"},
        headers=student_headers,
    )
    assert chat.status_code == 200
    assert "Te faltan" in chat.json()["assistantMessage"]["mensaje"]


def test_pdf_pipeline_extracts_text_and_persists_graph() -> None:
    headers = _login("admin@curriculapath.edu")

    suffix = uuid4().int % 900 + 100
    course_a = f"NEW{suffix}"
    course_b = f"LAB{suffix}"

    pdf = pymupdf.open()
    page = pdf.new_page()
    page.insert_text(
        (72, 72),
        f"{course_a} | Seminario de Innovación | 3 | 1\n"
        f"{course_b} | Laboratorio de Producto | 3 | 2\n"
        f"{course_a} -> {course_b}",
    )
    pdf_bytes = pdf.tobytes()
    pdf.close()

    upload = client.post(
        "/api/v1/admin/curriculum-documents/upload",
        data={"program_id": "prog_systems"},
        files={"file": ("malla-real.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    assert upload.status_code == 200
    document_id = upload.json()["id"]

    processed = client.post(
        f"/api/v1/admin/curriculum-documents/{document_id}/process",
        headers=headers,
    )
    assert processed.status_code == 200
    payload = processed.json()
    assert payload["document"]["estadoProcesamiento"] == "validando"
    assert payload["extraction"]["metodoExtraccion"] == "texto_pdf"
    assert [course["codigo"] for course in payload["courses"]] == [course_a, course_b]
    assert payload["dependencies"][0]["materia"] == course_b
    assert payload["diagnostics"]["recommendedAction"] == "review"
    assert payload["diagnostics"]["pagesWithNativeText"] == 1

    approved = client.post(
        f"/api/v1/admin/curriculum-documents/{document_id}/approve-graph",
        json={
            "versionId": "ver_sys_2025",
            "courses": payload["courses"],
            "dependencies": payload["dependencies"],
        },
        headers=headers,
    )
    assert approved.status_code == 200
    assert approved.json()["createdCourses"] == 2
    assert approved.json()["createdDependencies"] == 1


def test_scanned_pdf_without_ocr_recommends_retry(monkeypatch) -> None:
    import app.services.pdf_processing as pdf_processing

    monkeypatch.setattr(pdf_processing.shutil, "which", lambda _: None)
    headers = _login("admin@curriculapath.edu")
    png_1x1 = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aMcAAAAASUVORK5CYII=",
    )

    pdf = pymupdf.open()
    page = pdf.new_page()
    page.insert_image(pymupdf.Rect(72, 72, 220, 220), stream=png_1x1)
    pdf_bytes = pdf.tobytes()
    pdf.close()

    upload = client.post(
        "/api/v1/admin/curriculum-documents/upload",
        data={"program_id": "prog_systems"},
        files={"file": ("malla-escaneada.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    assert upload.status_code == 200
    document_id = upload.json()["id"]

    processed = client.post(
        f"/api/v1/admin/curriculum-documents/{document_id}/process",
        headers=headers,
    )
    assert processed.status_code == 200
    diagnostics = processed.json()["diagnostics"]
    assert diagnostics["scannedLike"] is True
    assert diagnostics["canRetryWithOcr"] is True
    assert diagnostics["recommendedAction"] == "install_ocr_and_retry"


def test_curriculum_image_upload_enters_ocr_pipeline(monkeypatch) -> None:
    import app.services.pdf_processing as pdf_processing

    monkeypatch.setattr(pdf_processing.shutil, "which", lambda _: None)
    headers = _login("admin@curriculapath.edu")
    png_1x1 = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aMcAAAAASUVORK5CYII=",
    )

    upload = client.post(
        "/api/v1/admin/curriculum-documents/upload",
        data={"program_id": "prog_systems"},
        files={"file": ("foto-malla.png", png_1x1, "image/png")},
        headers=headers,
    )
    assert upload.status_code == 200
    assert upload.json()["tipoArchivo"] == "image/png"
    document_id = upload.json()["id"]

    processed = client.post(
        f"/api/v1/admin/curriculum-documents/{document_id}/process",
        headers=headers,
    )
    assert processed.status_code == 200
    payload = processed.json()
    assert payload["extraction"]["metodoExtraccion"] == "ocr_imagen"
    assert payload["diagnostics"]["scannedLike"] is True
    assert payload["diagnostics"]["recommendedAction"] == "install_ocr_and_retry"


def test_pdf_graph_approval_rejects_invalid_review_payloads() -> None:
    headers = _login("admin@curriculapath.edu")
    suffix = uuid4().int % 900 + 100
    course_a = f"REV{suffix}"
    course_b = f"DEP{suffix}"

    pdf = pymupdf.open()
    pdf.new_page()
    pdf_bytes = pdf.tobytes()
    pdf.close()

    upload = client.post(
        "/api/v1/admin/curriculum-documents/upload",
        data={"program_id": "prog_systems"},
        files={"file": ("malla-revision.pdf", pdf_bytes, "application/pdf")},
        headers=headers,
    )
    document_id = upload.json()["id"]

    duplicate_courses = client.post(
        f"/api/v1/admin/curriculum-documents/{document_id}/approve-graph",
        json={
            "versionId": "ver_sys_2025",
            "courses": [
                {
                    "codigo": course_a,
                    "nombre": "Seminario A",
                    "creditos": 3,
                    "semestre": 1,
                    "confianza": 1,
                },
                {
                    "codigo": course_a.lower(),
                    "nombre": "Seminario duplicado",
                    "creditos": 3,
                    "semestre": 1,
                    "confianza": 1,
                },
            ],
            "dependencies": [],
        },
        headers=headers,
    )
    assert duplicate_courses.status_code == 422

    unknown_dependency = client.post(
        f"/api/v1/admin/curriculum-documents/{document_id}/approve-graph",
        json={
            "versionId": "ver_sys_2025",
            "courses": [
                {
                    "codigo": course_a,
                    "nombre": "Seminario A",
                    "creditos": 3,
                    "semestre": 1,
                    "confianza": 1,
                }
            ],
            "dependencies": [
                {
                    "materia": course_a,
                    "requiere": "NOEXISTE",
                    "tipo": "prerequisito",
                    "confianza": 1,
                }
            ],
        },
        headers=headers,
    )
    assert unknown_dependency.status_code == 422

    cyclic_review = client.post(
        f"/api/v1/admin/curriculum-documents/{document_id}/approve-graph",
        json={
            "versionId": "ver_sys_2025",
            "courses": [
                {
                    "codigo": course_a,
                    "nombre": "Seminario A",
                    "creditos": 3,
                    "semestre": 1,
                    "confianza": 1,
                },
                {
                    "codigo": course_b,
                    "nombre": "Seminario B",
                    "creditos": 3,
                    "semestre": 2,
                    "confianza": 1,
                },
            ],
            "dependencies": [
                {
                    "materia": course_a,
                    "requiere": course_b,
                    "tipo": "prerequisito",
                    "confianza": 1,
                },
                {
                    "materia": course_b,
                    "requiere": course_a,
                    "tipo": "prerequisito",
                    "confianza": 1,
                },
            ],
        },
        headers=headers,
    )
    assert cyclic_review.status_code == 422


def test_rag_retrieve_uses_real_stored_context() -> None:
    response = client.post(
        "/api/v1/rag/retrieve",
        json={
            "studentId": "student_1",
            "pregunta": "¿Qué dice el documento sobre programación?",
        },
        headers=_login("estudiante@curriculapath.edu"),
    )
    assert response.status_code == 200
    payload = response.json()
    assert "documento PDF procesado" in payload["fuentes"][0]
    assert "Cadena de programación" in payload["contexto"]


def test_rag_queries_are_returned_in_message_order() -> None:
    headers = _login("estudiante@curriculapath.edu")
    sessions = client.get(
        "/api/v1/chat/sessions",
        params={"student_id": "student_1"},
        headers=headers,
    )
    session_id = sessions.json()[0]["id"]
    sent = client.post(
        f"/api/v1/chat/sessions/{session_id}/messages",
        json={"mensaje": "¿Qué dice el documento sobre programación?"},
        headers=headers,
    )
    assert sent.status_code == 200

    queries = client.get(
        f"/api/v1/chat/sessions/{session_id}/rag-queries",
        headers=headers,
    )
    assert queries.status_code == 200
    assert queries.json()[-1]["pregunta"] == "¿Qué dice el documento sobre programación?"


def test_llm_generate_falls_back_when_local_server_is_unavailable() -> None:
    response = client.post(
        "/api/v1/llm/generate",
        json={
            "studentId": "student_1",
            "pregunta": "¿Cuántos créditos me faltan?",
            "endpoint": "http://127.0.0.1:9",
            "model": "gemma",
        },
        headers=_login("estudiante@curriculapath.edu"),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["generationMode"] == "mock_fallback"
    assert "Te faltan" in payload["respuesta"]


def test_llm_connect_reports_actionable_diagnostics_when_unavailable() -> None:
    response = client.post(
        "/api/v1/llm/connect",
        json={
            "endpoint": "http://127.0.0.1:9",
            "model": "gemma",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["connected"] is False
    assert payload["reachable"] is False
    assert payload["issues"]
    assert payload["nextSteps"]


def test_admin_mutations_require_admin_role() -> None:
    payload = {
        "codigo": f"TMP{uuid4().hex[:6]}",
        "nombre": "Programa temporal",
        "totalCreditos": 120,
        "activo": True,
    }
    anonymous = client.post("/api/v1/programs", json=payload)
    assert anonymous.status_code == 401

    student = client.post(
        "/api/v1/programs",
        json=payload,
        headers=_login("estudiante@curriculapath.edu"),
    )
    assert student.status_code == 403


def test_admin_validations_reject_duplicates_and_invalid_dependencies() -> None:
    headers = _login("admin@curriculapath.edu")

    duplicate_program = client.post(
        "/api/v1/programs",
        json={
            "codigo": "INGSIS",
            "nombre": "Ingeniería de Sistemas duplicada",
            "totalCreditos": 162,
            "activo": True,
        },
        headers=headers,
    )
    assert duplicate_program.status_code == 422

    duplicate_course = client.post(
        "/api/v1/courses",
        json={
            "versionMallaId": "ver_sys_2025",
            "codigo": "INF101",
            "nombre": "Programación I duplicada",
            "creditos": 4,
            "semestreSugerido": 1,
            "electiva": False,
        },
        headers=headers,
    )
    assert duplicate_course.status_code == 422

    self_dependency = client.post(
        "/api/v1/admin/dependencies",
        json={
            "materiaId": "sys_inf201",
            "materiaRequeridaId": "sys_inf201",
            "tipo": "prerequisito",
        },
        headers=headers,
    )
    assert self_dependency.status_code == 422

    cross_version_dependency = client.post(
        "/api/v1/admin/dependencies",
        json={
            "materiaId": "sys_inf201",
            "materiaRequeridaId": "adm_adm101",
            "tipo": "prerequisito",
        },
        headers=headers,
    )
    assert cross_version_dependency.status_code == 422

    cyclic_dependency = client.post(
        "/api/v1/admin/dependencies",
        json={
            "materiaId": "sys_inf201",
            "materiaRequeridaId": "sys_inf202",
            "tipo": "prerequisito",
        },
        headers=headers,
    )
    assert cyclic_dependency.status_code == 422


def test_admin_activity_is_persisted_after_mutation() -> None:
    headers = _login("admin@curriculapath.edu")
    suffix = uuid4().hex[:6].upper()
    created = client.post(
        "/api/v1/programs",
        json={
            "codigo": f"ADM{suffix}",
            "nombre": f"Programa de prueba {suffix}",
            "totalCreditos": 120,
            "activo": True,
        },
        headers=headers,
    )
    assert created.status_code == 201

    dashboard = client.get("/api/v1/admin/dashboard", headers=headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["activities"][0]["descripcion"].startswith("Programa creado:")


def test_student_access_rules_and_advisor_directory() -> None:
    student_headers = _login("estudiante@curriculapath.edu")
    advisor_headers = _login("asesor@curriculapath.edu")

    forbidden_profile = client.get(
        "/api/v1/students/student_2/profile",
        headers=student_headers,
    )
    assert forbidden_profile.status_code == 403

    own_profile = client.get(
        "/api/v1/students/student_1/profile",
        headers=student_headers,
    )
    assert own_profile.status_code == 200

    directory = client.get("/api/v1/students", headers=advisor_headers)
    assert directory.status_code == 200
    assert {item["student"]["id"] for item in directory.json()} >= {"student_1", "student_2"}

    advisor_write_attempt = client.patch(
        "/api/v1/students/student_1/history/sys_inf201",
        json={"estado": "aprobada"},
        headers=advisor_headers,
    )
    assert advisor_write_attempt.status_code == 403


def test_auth_register_recovery_and_program_selection_flow() -> None:
    suffix = uuid4().hex[:8]
    email = f"registro.{suffix}@curriculapath.edu"
    code = f"2026{suffix[:5].upper()}"

    registered = client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Estudiante Registro",
            "email": email,
            "password": "demo123",
            "codigoEstudiantil": code,
            "semestreActual": 1,
            "cargaMaximaCreditos": 18,
            "programaPrincipalId": "prog_systems",
            "programaSecundarioId": "prog_business",
        },
    )
    assert registered.status_code == 201
    payload = registered.json()
    student_id = payload["studentId"]
    headers = {"Authorization": f"Bearer {payload['accessToken']}"}

    profile = client.get(f"/api/v1/students/{student_id}/profile", headers=headers)
    assert profile.status_code == 200
    assert len(profile.json()["programs"]) == 2

    progress = client.get(
        f"/api/v1/students/{student_id}/progress/prog_systems",
        headers=headers,
    )
    assert progress.status_code == 200
    assert progress.json()["cargaMaximaCreditos"] == 18
    assert progress.json()["semestresRestantesEstimados"] >= 9
    assert progress.json()["semestreEstimadoGraduacion"] >= 9
    assert progress.json()["creditosAprobados"] == 0
    assert progress.json()["promedioAcumulado"] is None

    patched = client.patch(
        f"/api/v1/students/{student_id}/programs",
        json={"programaPrincipalId": "prog_business"},
        headers=headers,
    )
    assert patched.status_code == 200
    assert patched.json()["enrollments"][0]["programaId"] == "prog_business"

    recovery = client.post("/api/v1/auth/recovery/request", json={"email": email})
    assert recovery.status_code == 200
    demo_code = recovery.json()["demoCode"]
    confirmed = client.post(
        "/api/v1/auth/recovery/confirm",
        json={"email": email, "code": demo_code, "newPassword": "nueva123"},
    )
    assert confirmed.status_code == 200

    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "nueva123"},
    )
    assert login.status_code == 200


def test_admin_user_management_endpoints() -> None:
    headers = _login("admin@curriculapath.edu")
    suffix = uuid4().hex[:8]
    email = f"inactivo.{suffix}@curriculapath.edu"

    created = client.post(
        "/api/v1/admin/users",
        json={
            "nombre": "Usuario Inactivo",
            "email": email,
            "password": "demo123",
            "rol": "advisor",
            "activo": False,
        },
        headers=headers,
    )
    assert created.status_code == 201
    user_id = created.json()["user"]["id"]

    login_inactive = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "demo123"},
    )
    assert login_inactive.status_code == 401

    listed = client.get("/api/v1/admin/users", headers=headers)
    assert listed.status_code == 200
    assert any(item["user"]["email"] == email for item in listed.json())

    activated = client.patch(
        f"/api/v1/admin/users/{user_id}",
        json={"activo": True, "nombre": "Usuario Activado"},
        headers=headers,
    )
    assert activated.status_code == 200
    assert activated.json()["user"]["activo"] is True

    reset = client.post(
        f"/api/v1/admin/users/{user_id}/reset-password",
        json={"newPassword": "clave456"},
        headers=headers,
    )
    assert reset.status_code == 200

    login_active = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "clave456"},
    )
    assert login_active.status_code == 200
