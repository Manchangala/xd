from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.seeds.data import seed_database


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)


if __name__ == "__main__":
    init_db()
