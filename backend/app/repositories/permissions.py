from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.effective_permission import EffectivePermission


def list_effective_permissions(db: Session) -> list[EffectivePermission]:
    statement = select(EffectivePermission).order_by(
        EffectivePermission.share_id.asc(),
        EffectivePermission.nas_user_id.asc(),
    )
    return list(db.execute(statement).scalars().all())
