"""
Schemas para operações de backup e restore do banco de dados
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class BackupInfo(BaseModel):
    """Informações sobre um backup"""
    id: str
    filename: str
    created_at: datetime
    created_by: str
    size_bytes: int
    size_human: str
    description: Optional[str] = None
    
class BackupResponse(BaseModel):
    """Resposta da criação de backup"""
    success: bool
    message: str
    backup_info: Optional[BackupInfo] = None

class BackupListResponse(BaseModel):
    """Lista de backups disponíveis"""
    success: bool
    backups: List[BackupInfo]

class RestoreRequest(BaseModel):
    """Requisição para restaurar backup"""
    backup_id: str
    confirm_replace: bool = False
    
class RestoreResponse(BaseModel):
    """Resposta da operação de restore"""
    success: bool
    message: str
    
class BackupStatus(BaseModel):
    """Status do sistema de backup"""
    backup_directory: str
    total_backups: int
    total_size_bytes: int
    total_size_human: str
    oldest_backup: Optional[datetime] = None
    newest_backup: Optional[datetime] = None
    available_space_bytes: int
    available_space_human: str
