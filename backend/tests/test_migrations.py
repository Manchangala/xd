from pathlib import Path
from tempfile import TemporaryDirectory

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.db.base import Base
from app.models import entities  # noqa: F401


def test_alembic_migrations_build_current_schema() -> None:
    with TemporaryDirectory() as temporary_directory:
        db_path = Path(temporary_directory) / "migration_smoke.db"
        database_url = f"sqlite:///{db_path.as_posix()}"

        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        config.set_main_option("sqlalchemy.url", database_url)
        command.upgrade(config, "head")

        engine = create_engine(database_url)
        migrated_tables = set(inspect(engine).get_table_names())
        expected_tables = set(Base.metadata.tables)
        engine.dispose()

    assert expected_tables <= migrated_tables
    assert "alembic_version" in migrated_tables
