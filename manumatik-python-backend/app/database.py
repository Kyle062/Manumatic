from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Update USER, PASSWORD, and HOST if needed
SQLALCHEMY_DATABASE_URL = "mysql+mysqlconnector://root:@localhost/manumatik"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()