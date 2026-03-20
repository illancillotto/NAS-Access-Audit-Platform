from pydantic import BaseModel, ConfigDict


class DashboardSummaryResponse(BaseModel):
    nas_users: int
    nas_groups: int
    shares: int
    reviews: int
    snapshots: int


class NasUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str | None
    email: str | None
    source_uid: str | None
    is_active: bool
    last_seen_snapshot_id: int | None


class NasGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    last_seen_snapshot_id: int | None


class ShareResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    path: str
    sector: str | None
    description: str | None
    last_seen_snapshot_id: int | None


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    snapshot_id: int | None
    nas_user_id: int
    share_id: int
    reviewer_user_id: int
    decision: str
    note: str | None
