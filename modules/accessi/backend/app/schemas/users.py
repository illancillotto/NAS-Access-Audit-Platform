from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ApplicationUserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "viewer"
    is_active: bool = True
    module_accessi: bool = True
    module_rete: bool = False
    module_inventario: bool = False

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


class ApplicationUserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    role: str | None = None
    is_active: bool | None = None
    module_accessi: bool | None = None
    module_rete: bool | None = None
    module_inventario: bool | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str | None) -> str | None:
        if value is not None and len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        return value


class ApplicationUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role: str
    is_active: bool
    module_accessi: bool
    module_rete: bool
    module_inventario: bool
    enabled_modules: list[str]
    created_at: datetime
    updated_at: datetime


class ApplicationUserListResponse(BaseModel):
    items: list[ApplicationUserResponse]
    total: int = Field(ge=0)
