from pydantic import BaseModel
from typing import Optional, List, Literal, Union
from datetime import datetime

class QueryRequest(BaseModel):
    type: Literal["ping", "traceroute", "bgp", "bgp-summary"]
    target: str
    routerId: int  # Frontend envia routerId, não router_id
    options: Optional[dict] = {}

class QueryResponse(BaseModel):
    id: str
    status: Literal["success", "error"]
    data: Optional[str] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None

class LookingGlassQuery(BaseModel):
    id: Optional[str] = None
    type: Literal["ping", "traceroute", "bgp", "bgp-summary"]
    target: str
    router: str
    timestamp: datetime
    status: Literal["pending", "running", "completed", "error"]
    output: Optional[str] = None
    error: Optional[str] = None

class IpOrigem(BaseModel):
    id: int
    name: str
    type: str
    ip: str

class RouterInfo(BaseModel):
    id: int
    name: str
    hostname: str
    location: str
    status: Literal["online", "offline"]
    ip_origens: Optional[List[IpOrigem]] = []
