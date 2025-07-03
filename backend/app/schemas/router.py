from pydantic import BaseModel

class IpOrigem(BaseModel):
    id: int | None = None
    name: str
    type: str
    ip: str

class RouterBase(BaseModel):
    name: str
    ip: str
    ssh_port: int
    ssh_user: str
    asn: int
    note: str | None = None
    ip_origens: list[IpOrigem] = []

class RouterCreate(RouterBase):
    ssh_password: str

class RouterUpdate(BaseModel):
    name: str | None = None
    ip: str | None = None
    ssh_port: int | None = None
    ssh_user: str | None = None
    ssh_password: str | None = None
    asn: int | None = None
    note: str | None = None
    is_active: bool | None = None
    ip_origens: list[IpOrigem] | None = None


class RouterRead(RouterBase):
    id: int
    is_active: bool
    ssh_password: str = ""  # Não retornar a senha real por segurança

    class Config:
        orm_mode = True
        
    @classmethod
    def from_orm(cls, obj):
        # Substituir a senha por string vazia para não expor a senha codificada
        data = {}
        for field in cls.__fields__:
            if field == 'ssh_password':
                data[field] = ""  # Sempre retornar vazio
            else:
                data[field] = getattr(obj, field)
        return cls(**data)
