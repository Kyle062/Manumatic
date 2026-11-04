from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Changed 'mysqlconnector' to 'pymysql' for better compatibility
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost/manumatik"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()