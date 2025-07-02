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
    ssh_password: str  # Exibe senha em texto puro para teste

    class Config:
        orm_mode = True
