import os
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.db.session import APP_ENV, Base, engine


LOCAL_ENVS = {"development", "dev", "local", "test", "testing"}


def _alembic_config() -> Config:
    project_root = Path(__file__).resolve().parents[2]
    config = Config(str(project_root / "alembic.ini"))
    config.set_main_option("script_location", str(project_root / "alembic"))
    config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL", ""))
    return config


def bootstrap_database() -> None:
    if APP_ENV in LOCAL_ENVS:
        Base.metadata.create_all(bind=engine)
        return

    if os.getenv("NAMA_AUTO_MIGRATE", "").strip().lower() in {"1", "true", "yes"}:
        command.upgrade(_alembic_config(), "head")
