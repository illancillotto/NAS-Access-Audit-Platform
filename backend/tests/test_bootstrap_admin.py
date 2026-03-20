from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.services.bootstrap_admin import ensure_bootstrap_admin


def test_ensure_bootstrap_admin_creates_admin_once(monkeypatch) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    monkeypatch.setattr(
        "app.services.bootstrap_admin.settings.bootstrap_admin_username",
        "seedadmin",
    )
    monkeypatch.setattr(
        "app.services.bootstrap_admin.settings.bootstrap_admin_email",
        "seedadmin@example.local",
    )
    monkeypatch.setattr(
        "app.services.bootstrap_admin.settings.bootstrap_admin_password",
        "seed-secret",
    )

    db = SessionLocal()
    try:
      first_user, first_created = ensure_bootstrap_admin(db)
      second_user, second_created = ensure_bootstrap_admin(db)
    finally:
      db.close()

    assert first_created is True
    assert second_created is False
    assert first_user.id == second_user.id
    assert first_user.username == "seedadmin"
    assert first_user.role == "admin"
