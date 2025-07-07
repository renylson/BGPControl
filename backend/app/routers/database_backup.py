"""
Router para gerenciamento de backup e restore do banco de dados
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user, is_admin
from app.models.user import User
from app.schemas.database_backup import (
    BackupResponse, BackupListResponse, RestoreResponse, 
    BackupInfo, RestoreRequest
)
from app.services.database_backup import DatabaseBackupService
from typing import List
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()
backup_service = DatabaseBackupService()

@router.post("/create", response_model=BackupResponse)
async def create_backup(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(is_admin)
):
    """
    Cria um backup do banco de dados
    Apenas administradores podem executar esta operação
    """
    try:
        backup_info = await backup_service.create_backup(
            created_by=current_user.username
        )
        
        return BackupResponse(
            success=True,
            message="Backup criado com sucesso",
            backup_info=backup_info
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar backup: {str(e)}"
        )

@router.get("/list", response_model=BackupListResponse)
async def list_backups(
    current_user: User = Depends(is_admin)
):
    """
    Lista todos os backups disponíveis
    """
    try:
        backups = await backup_service.list_backups()
        return BackupListResponse(
            success=True,
            backups=backups
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar backups: {str(e)}"
        )

@router.get("/download/{backup_id}")
async def download_backup(
    backup_id: str,
    current_user: User = Depends(is_admin)
):
    """
    Download de um arquivo de backup específico
    """
    try:
        backup_path = await backup_service.get_backup_path(backup_id)
        
        if not os.path.exists(backup_path):
            raise HTTPException(
                status_code=404,
                detail="Backup não encontrado"
            )
        
        filename = f"bgpcontrol_backup_{backup_id}.sql"
        
        return FileResponse(
            path=backup_path,
            filename=filename,
            media_type='application/sql'
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao fazer download do backup: {str(e)}"
        )

@router.post("/restore", response_model=RestoreResponse)
async def restore_backup(
    restore_request: RestoreRequest,
    current_user: User = Depends(is_admin)
):
    """
    Restaura o banco de dados a partir de um backup
    CUIDADO: Esta operação substitui todos os dados atuais
    """
    try:
        success = await backup_service.restore_backup(
            backup_id=restore_request.backup_id,
            confirm_replace=restore_request.confirm_replace,
            restored_by=current_user.username
        )
        
        if success:
            return RestoreResponse(
                success=True,
                message="Banco de dados restaurado com sucesso"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Falha na restauração do banco de dados"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao restaurar backup: {str(e)}"
        )

@router.post("/upload-restore", response_model=RestoreResponse)
async def upload_and_restore(
    file: UploadFile = File(...),
    confirm_replace: bool = Form(False),
    current_user: User = Depends(is_admin)
):
    """
    Upload e restauração de um arquivo de backup SQL
    """
    try:
        # Debug logging
        logger.info(f"Upload restore: confirm_replace={confirm_replace}, type={type(confirm_replace)}")
        
        # Validar arquivo
        if not (file.filename.endswith('.sql') or file.filename.endswith('.sql.gz')):
            raise HTTPException(
                status_code=400,
                detail="Apenas arquivos .sql ou .sql.gz são permitidos"
            )
        
        # Salvar arquivo temporariamente e restaurar
        success = await backup_service.restore_from_upload(
            file=file,
            confirm_replace=confirm_replace,
            restored_by=current_user.username
        )
        
        if success:
            return RestoreResponse(
                success=True,
                message="Banco de dados restaurado a partir do upload com sucesso"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Falha na restauração do banco de dados"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao restaurar backup do upload: {str(e)}"
        )

@router.delete("/delete/{backup_id}")
async def delete_backup(
    backup_id: str,
    current_user: User = Depends(is_admin)
):
    """
    Remove um backup específico
    """
    try:
        success = await backup_service.delete_backup(
            backup_id=backup_id,
            deleted_by=current_user.username
        )
        
        if success:
            return {"success": True, "message": "Backup removido com sucesso"}
        else:
            raise HTTPException(
                status_code=404,
                detail="Backup não encontrado"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao remover backup: {str(e)}"
        )

@router.post("/cleanup")
async def cleanup_old_backups(
    days_to_keep: int = 30,
    current_user: User = Depends(is_admin)
):
    """
    Remove backups antigos (padrão: mais de 30 dias)
    """
    try:
        removed_count = await backup_service.cleanup_old_backups(
            days_to_keep=days_to_keep,
            cleaned_by=current_user.username
        )
        
        return {
            "success": True,
            "message": f"{removed_count} backup(s) antigo(s) removido(s)"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro na limpeza de backups: {str(e)}"
        )

@router.get("/status")
async def backup_status(
    current_user: User = Depends(is_admin)
):
    """
    Retorna informações sobre o sistema de backup
    """
    try:
        status = await backup_service.get_backup_status()
        return status
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter status dos backups: {str(e)}"
        )
