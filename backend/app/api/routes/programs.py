from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.entities import Program, User
from app.models.enums import UserRole
from app.schemas.curriculum import ProgramCreate, ProgramResponse, ProgramUpdate
from app.services.admin_service import create_program as create_program_service
from app.services.admin_service import update_program as update_program_service

router = APIRouter()


@router.get("", response_model=list[ProgramResponse])
def list_programs(db: Session = Depends(get_db)) -> list[Program]:
    return list(db.scalars(select(Program).order_by(Program.nombre)))


@router.get("/{program_id}", response_model=ProgramResponse)
def get_program(program_id: str, db: Session = Depends(get_db)) -> Program:
    program = db.get(Program, program_id)
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no encontrado")
    return program


@router.post("", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(
    payload: ProgramCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> Program:
    return create_program_service(db, payload)


@router.patch("/{program_id}", response_model=ProgramResponse)
def update_program(
    program_id: str,
    payload: ProgramUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> Program:
    return update_program_service(db, program_id, payload)
