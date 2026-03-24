from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catasto import CatastoDocument


class CatastoDocumentNotFoundError(Exception):
    pass


def list_documents_for_user(
    db: Session,
    user_id: int,
    *,
    comune: str | None = None,
    foglio: str | None = None,
    particella: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
) -> list[CatastoDocument]:
    statement = select(CatastoDocument).where(CatastoDocument.user_id == user_id)

    if comune:
        statement = statement.where(CatastoDocument.comune.ilike(f"%{comune.strip()}%"))
    if foglio:
        statement = statement.where(CatastoDocument.foglio == foglio.strip())
    if particella:
        statement = statement.where(CatastoDocument.particella == particella.strip())
    if created_from:
        statement = statement.where(CatastoDocument.created_at >= created_from)
    if created_to:
        statement = statement.where(CatastoDocument.created_at <= created_to)

    statement = statement.order_by(CatastoDocument.created_at.desc())
    return list(db.scalars(statement).all())


def get_document_for_user(db: Session, user_id: int, document_id: UUID) -> CatastoDocument:
    document = db.scalar(
        select(CatastoDocument).where(
            CatastoDocument.id == document_id,
            CatastoDocument.user_id == user_id,
        ),
    )
    if document is None:
        raise CatastoDocumentNotFoundError(f"Document {document_id} not found")
    return document
