from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func, desc, delete
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.deps import get_db, get_current_user
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse, AuditLogFilter, AuditLogStats

router = APIRouter()

@router.get("/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    user_id: Optional[int] = Query(None, description="ID do usuário"),
    action: Optional[str] = Query(None, description="Tipo de ação"),
    resource_type: Optional[str] = Query(None, description="Tipo de recurso"),
    date_from: Optional[datetime] = Query(None, description="Data inicial"),
    date_to: Optional[datetime] = Query(None, description="Data final"),
    limit: int = Query(100, description="Limite de resultados"),
    offset: int = Query(0, description="Offset para paginação"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Buscar logs de auditoria com filtros"""
    
    # Verificar permissões - apenas administradores podem ver logs de outros usuários
    if current_user.profile != "Administrador" and user_id and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Se não for administrador, mostrar apenas seus próprios logs
    if current_user.profile != "Administrador":
        user_id = current_user.id
    
    # Construir query com join
    stmt = select(AuditLog, User).join(User, AuditLog.user_id == User.id)
    
    # Aplicar filtros
    conditions = []
    if user_id:
        conditions.append(AuditLog.user_id == user_id)
    if action:
        conditions.append(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        conditions.append(AuditLog.resource_type == resource_type)
    if date_from:
        conditions.append(AuditLog.created_at >= date_from)
    if date_to:
        conditions.append(AuditLog.created_at <= date_to)
    
    if conditions:
        stmt = stmt.where(and_(*conditions))
    
    # Ordenar por data (mais recente primeiro)
    stmt = stmt.order_by(desc(AuditLog.created_at))
    
    # Aplicar paginação
    stmt = stmt.offset(offset).limit(limit)
    
    # Executar query
    result = await db.execute(stmt)
    rows = result.fetchall()
    
    # Converter para response model
    logs = []
    for log, user in rows:
        log_data = AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            method=log.method,
            endpoint=log.endpoint,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            request_data=log.request_data,
            response_status=log.response_status,
            details=log.details,
            created_at=log.created_at,
            user_name=user.name,
            username=user.username
        )
        logs.append(log_data)
    
    return logs

@router.get("/logs/stats", response_model=AuditLogStats)
async def get_audit_stats(
    user_id: Optional[int] = Query(None, description="ID do usuário"),
    days: int = Query(30, description="Número de dias para estatísticas"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter estatísticas de auditoria"""
    
    # Verificar permissões
    if current_user.profile != "Administrador" and user_id and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Se não for administrador, mostrar apenas suas próprias estatísticas
    if current_user.profile != "Administrador":
        user_id = current_user.id
    
    # Data de início para as estatísticas
    date_from = datetime.utcnow() - timedelta(days=days)
    
    # Query base com filtros
    conditions = [AuditLog.created_at >= date_from]
    if user_id:
        conditions.append(AuditLog.user_id == user_id)
    
    # Contar total de ações
    total_stmt = select(func.count(AuditLog.id)).where(and_(*conditions))
    total_result = await db.execute(total_stmt)
    total_actions = total_result.scalar()
    
    # Contar por tipo de ação
    login_stmt = select(func.count(AuditLog.id)).where(and_(*conditions, AuditLog.action == "LOGIN"))
    login_result = await db.execute(login_stmt)
    login_count = login_result.scalar()
    
    create_stmt = select(func.count(AuditLog.id)).where(and_(*conditions, AuditLog.action.like("CREATE%")))
    create_result = await db.execute(create_stmt)
    create_count = create_result.scalar()
    
    update_stmt = select(func.count(AuditLog.id)).where(and_(*conditions, AuditLog.action.like("UPDATE%")))
    update_result = await db.execute(update_stmt)
    update_count = update_result.scalar()
    
    delete_stmt = select(func.count(AuditLog.id)).where(and_(*conditions, AuditLog.action.like("DELETE%")))
    delete_result = await db.execute(delete_stmt)
    delete_count = delete_result.scalar()
    
    # Último login
    last_login_stmt = (
        select(AuditLog.created_at)
        .where(and_(*conditions, AuditLog.action == "LOGIN"))
        .order_by(desc(AuditLog.created_at))
        .limit(1)
    )
    last_login_result = await db.execute(last_login_stmt)
    last_login = last_login_result.scalar()
    
    return AuditLogStats(
        total_actions=total_actions,
        login_count=login_count,
        create_count=create_count,
        update_count=update_count,
        delete_count=delete_count,
        last_login=last_login
    )

@router.get("/logs/actions", response_model=List[str])
async def get_available_actions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter lista de ações disponíveis para filtro"""
    
    stmt = select(AuditLog.action).distinct()
    result = await db.execute(stmt)
    actions = result.scalars().all()
    return [action for action in actions if action]

@router.get("/logs/resource-types", response_model=List[str])
async def get_available_resource_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter lista de tipos de recursos disponíveis para filtro"""
    
    stmt = select(AuditLog.resource_type).distinct()
    result = await db.execute(stmt)
    resource_types = result.scalars().all()
    return [resource_type for resource_type in resource_types if resource_type]

@router.delete("/logs/cleanup")
async def cleanup_old_logs(
    days: int = Query(90, description="Remover logs mais antigos que X dias"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Limpar logs antigos (apenas administradores)"""
    
    if current_user.profile != "Administrador":
        raise HTTPException(status_code=403, detail="Apenas administradores podem limpar logs")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Usar delete com where clause para AsyncSession
    stmt = delete(AuditLog).where(AuditLog.created_at < cutoff_date)
    result = await db.execute(stmt)
    deleted_count = result.rowcount
    
    await db.commit()
    
    return {"message": f"Removidos {deleted_count} logs mais antigos que {days} dias"}
