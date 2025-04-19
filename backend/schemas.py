from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    is_active: bool | None = None


class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True  # SQLAlchemyモデルなどからの読み込みを許可
