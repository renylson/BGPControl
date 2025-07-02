from pydantic import BaseModel

class UserBase(BaseModel):
    username: str
    name: str
    profile: str  # 'Administrador' ou 'Operador'

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: str | None = None
    profile: str | None = None
    is_active: bool | None = None

class UserRead(UserBase):
    id: int
    is_active: bool

    class Config:
        orm_mode = True
