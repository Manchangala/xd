from fastapi import APIRouter

from app.api.routes import (
    admin,
    auth,
    chat,
    courses,
    curriculums,
    pdf_ingestion,
    programs,
    scenarios,
    simulation,
    students,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(programs.router, prefix="/programs", tags=["programs"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(curriculums.router, prefix="/curriculums", tags=["curriculums"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(simulation.router, prefix="/simulation", tags=["simulation"])
api_router.include_router(scenarios.router, tags=["scenarios"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(pdf_ingestion.router, prefix="/admin", tags=["pdf-ingestion"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(chat.rag_router, tags=["rag-chat"])
