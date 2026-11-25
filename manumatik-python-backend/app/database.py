import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker


def _load_env_file(path: Path, override: bool = False) -> None:
    """Load simple KEY=VALUE .env files without adding a dependency.

    Python-dotenv is not installed in every environment, so the service only
    needs the standard library here. Existing environment variables win unless
    override=True, which lets a local .env fine-tune the shared backend config.
    """
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and (override or key not in os.environ):
            os.environ[key] = value


# The Node backend already has the DB credentials, so reuse it first. A .env in
# the Python service folder can then override individual values if needed.
_load_env_file(Path(__file__).resolve().parents[2] / "backend" / ".env")
_load_env_file(Path(__file__).resolve().parents[1] / ".env", override=True)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "manumatik")

# URL.create() escapes special characters in passwords, so values such as '@'
# or '#' in a real password cannot break the connection string.
SQLALCHEMY_DATABASE_URL = URL.create(
    "mysql+pymysql",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT),
    database=DB_NAME,
)

# One engine is shared by the whole service; SQLAlchemy pools connections for us.
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Yield a DB session to a FastAPI route and always close it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
