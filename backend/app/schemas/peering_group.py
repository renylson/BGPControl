from pydantic import BaseModel
from typing import List, Optional

class PeeringGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    router_id: int

class PeeringGroupCreate(PeeringGroupBase):
    peering_ids: List[int]

class PeeringGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    peering_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None

class PeeringGroupRead(PeeringGroupBase):
    id: int
    is_active: bool
    peering_ids: List[int]

    class Config:
        orm_mode = True
