from pydantic import BaseModel

class PeeringBase(BaseModel):
    name: str
    ip: str
    type: str  # 'IPv4' ou 'IPv6'
    remote_asn: int
    remote_asn_name: str
    note: str | None = None
    router_id: int

class PeeringCreate(PeeringBase):
    pass

class PeeringUpdate(BaseModel):
    name: str | None = None
    ip: str | None = None
    type: str | None = None
    remote_asn: int | None = None
    remote_asn_name: str | None = None
    note: str | None = None
    router_id: int | None = None
    is_active: bool | None = None

class PeeringRead(PeeringBase):
    id: int
    is_active: bool

    class Config:
        orm_mode = True
