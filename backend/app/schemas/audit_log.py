from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class AuditLogBase(BaseModel):
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    method: str
    endpoint: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_data: Optional[str] = None
    response_status: Optional[int] = None
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    user_id: int

class AuditLogResponse(AuditLogBase):
    id: int
    user_id: int
    created_at: datetime
    user_name: Optional[str] = None
    username: Optional[str] = None

    class Config:
        from_attributes = True

class AuditLogFilter(BaseModel):
    user_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = 100
    offset: int = 0

class AuditLogStats(BaseModel):
    total_actions: int
    login_count: int
    create_count: int
    update_count: int
    delete_count: int
    last_login: Optional[datetime] = None
