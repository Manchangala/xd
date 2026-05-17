import os
import shutil
from pathlib import Path


TEST_DB_PATH = Path("curriculapath_test.db")
TEST_STORAGE_PATH = Path("storage/test-documents")

os.environ["DATABASE_URL"] = "sqlite:///./curriculapath_test.db"
os.environ["DOCUMENT_STORAGE_DIR"] = str(TEST_STORAGE_PATH).replace("\\", "/")

TEST_DB_PATH.unlink(missing_ok=True)
if TEST_STORAGE_PATH.exists():
    shutil.rmtree(TEST_STORAGE_PATH)


def pytest_sessionstart() -> None:
    from app.db.init_db import init_db

    init_db()


def pytest_sessionfinish() -> None:
    from app.db.session import engine

    engine.dispose()
    TEST_DB_PATH.unlink(missing_ok=True)
    if TEST_STORAGE_PATH.exists():
        shutil.rmtree(TEST_STORAGE_PATH)
