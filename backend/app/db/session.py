from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv("NAMA_ENV", os.getenv("ENV", "development")).lower()
DEFAULT_DATABASE_URL = "sqlite:///./nama_dev.db" if APP_ENV == "development" else None
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required in non-development environments.")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
