from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.entities import CurriculumDocument, DocumentExtraction, User
from app.models.enums import UserRole
from app.schemas.pdf import (
    ApproveGraphRequest,
    ApproveGraphResponse,
    CurriculumDocumentResponse,
    DocumentExtractionResponse,
    OcrStatusResponse,
    PdfProcessResponse,
)
from app.services.pdf_service import approve_graph, process_pdf, upload_pdf
from app.services.pdf_processing import get_ocr_status

router = APIRouter()


@router.post("/curriculum-documents/upload", response_model=CurriculumDocumentResponse)
def upload_curriculum_document(
    file: UploadFile = File(...),
    program_id: str = Form(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> CurriculumDocument:
    return upload_pdf(db, file, program_id)


@router.post("/curriculum-documents/{document_id}/process", response_model=PdfProcessResponse)
def process_curriculum_document(
    document_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> PdfProcessResponse:
    return process_pdf(db, document_id)


@router.get("/curriculum-documents/{document_id}/status", response_model=CurriculumDocumentResponse)
def document_status(
    document_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> CurriculumDocument:
    document = db.get(CurriculumDocument, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")
    return document


@router.get(
    "/curriculum-documents/{document_id}/extraction",
    response_model=DocumentExtractionResponse | None,
)
def document_extraction(
    document_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> DocumentExtraction | None:
    return (
        db.query(DocumentExtraction)
        .filter(DocumentExtraction.documento_malla_id == document_id)
        .order_by(DocumentExtraction.fecha_procesamiento.desc())
        .first()
    )


@router.post(
    "/curriculum-documents/{document_id}/approve-graph",
    response_model=ApproveGraphResponse,
)
def approve_document_graph(
    document_id: str,
    payload: ApproveGraphRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> ApproveGraphResponse:
    return approve_graph(db, document_id, payload)


@router.get("/ocr/status", response_model=OcrStatusResponse)
def ocr_status(_: User = Depends(require_roles(UserRole.ADMIN))) -> OcrStatusResponse:
    return get_ocr_status()
