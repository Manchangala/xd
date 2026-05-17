from pathlib import Path
from shutil import rmtree

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.seeds.data import seed_database


def reset_demo() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    storage_dir = Path(get_settings().document_storage_dir)
    if storage_dir.exists():
        rmtree(storage_dir)

    with SessionLocal() as db:
        seed_database(db)


if __name__ == "__main__":
    reset_demo()
    print("Demo restaurada con datos semilla limpios.")
