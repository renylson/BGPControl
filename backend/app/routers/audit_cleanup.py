"""
Router para gerenciamento de logs de auditoria e limpeza automática
"""
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user, is_admin
from app.models.user import User
from app.services.audit_cleanup import AuditLogCleanupService
from typing import Optional

router = APIRouter()
cleanup_service = AuditLogCleanupService()

@router.get("/stats")
async def get_audit_stats(
    current_user: User = Depends(is_admin)
):
    """
    Retorna estatísticas detalhadas dos logs de auditoria
    """
    try:
        stats = await cleanup_service.get_audit_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter estatísticas: {str(e)}"
        )

@router.post("/cleanup")
async def cleanup_old_logs(
    months_to_keep: int = 6,
    current_user: User = Depends(is_admin)
):
    """
    Remove logs de auditoria mais antigos que o período especificado
    Padrão: 6 meses
    """
    try:
        if months_to_keep < 1 or months_to_keep > 24:
            raise HTTPException(
                status_code=400,
                detail="Período deve estar entre 1 e 24 meses"
            )
        
        result = await cleanup_service.cleanup_old_logs(months_to_keep)
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro na limpeza de logs: {str(e)}"
        )

@router.post("/auto-cleanup")
async def enable_auto_cleanup(
    months_to_keep: int = 6,
    current_user: User = Depends(is_admin)
):
    """
    Configura limpeza automática dos logs de auditoria
    (Esta rota seria expandida futuramente para configurar cron jobs)
    """
    try:
        # Por enquanto, apenas executa a limpeza uma vez
        # No futuro, isso poderia configurar um job agendado
        result = await cleanup_service.cleanup_old_logs(months_to_keep)
        
        return {
            "success": True,
            "message": f"Limpeza executada - configuração para {months_to_keep} meses",
            "cleanup_result": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro na configuração de limpeza automática: {str(e)}"
        )
