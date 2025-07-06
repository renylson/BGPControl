"""
Serviço para limpeza automática de logs de auditoria
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, delete
from app.core.config import engine
from app.models.audit_log import AuditLog
import logging

logger = logging.getLogger(__name__)

class AuditLogCleanupService:
    def __init__(self):
        self.SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async def cleanup_old_logs(self, months_to_keep: int = 6) -> dict:
        """
        Remove logs de auditoria mais antigos que o período especificado
        
        Args:
            months_to_keep: Número de meses para manter (padrão: 6)
            
        Returns:
            dict: Resultado da operação com estatísticas
        """
        try:
            # Calcular data limite
            cutoff_date = datetime.now() - timedelta(days=months_to_keep * 30)
            
            logger.info(f"Iniciando limpeza de logs de auditoria anteriores a {cutoff_date}")
            
            async with self.SessionLocal() as session:
                # Contar logs que serão removidos
                count_result = await session.execute(
                    text("SELECT COUNT(*) FROM audit_logs WHERE created_at < :cutoff_date"),
                    {"cutoff_date": cutoff_date}
                )
                logs_to_remove = count_result.scalar()
                
                if logs_to_remove == 0:
                    logger.info("Nenhum log antigo encontrado para remoção")
                    return {
                        "success": True,
                        "logs_removed": 0,
                        "cutoff_date": cutoff_date.isoformat(),
                        "message": "Nenhum log antigo encontrado"
                    }
                
                # Obter estatísticas antes da remoção
                stats_result = await session.execute(
                    text("""
                        SELECT 
                            COUNT(*) as total_logs,
                            MIN(created_at) as oldest_log,
                            MAX(created_at) as newest_log
                        FROM audit_logs
                    """)
                )
                stats_before = stats_result.fetchone()
                
                # Remover logs antigos
                delete_result = await session.execute(
                    delete(AuditLog).where(AuditLog.created_at < cutoff_date)
                )
                
                await session.commit()
                
                # Obter estatísticas após remoção
                stats_result_after = await session.execute(
                    text("""
                        SELECT 
                            COUNT(*) as total_logs,
                            MIN(created_at) as oldest_log,
                            MAX(created_at) as newest_log
                        FROM audit_logs
                    """)
                )
                stats_after = stats_result_after.fetchone()
                
                logger.info(f"Limpeza concluída: {logs_to_remove} logs removidos")
                
                return {
                    "success": True,
                    "logs_removed": logs_to_remove,
                    "cutoff_date": cutoff_date.isoformat(),
                    "stats_before": {
                        "total_logs": stats_before.total_logs if stats_before else 0,
                        "oldest_log": stats_before.oldest_log.isoformat() if stats_before and stats_before.oldest_log else None,
                        "newest_log": stats_before.newest_log.isoformat() if stats_before and stats_before.newest_log else None
                    },
                    "stats_after": {
                        "total_logs": stats_after.total_logs if stats_after else 0,
                        "oldest_log": stats_after.oldest_log.isoformat() if stats_after and stats_after.oldest_log else None,
                        "newest_log": stats_after.newest_log.isoformat() if stats_after and stats_after.newest_log else None
                    },
                    "message": f"Removidos {logs_to_remove} logs de auditoria"
                }
                
        except Exception as e:
            logger.error(f"Erro na limpeza de logs de auditoria: {e}")
            raise e
    
    async def get_audit_stats(self) -> dict:
        """
        Retorna estatísticas dos logs de auditoria
        """
        try:
            async with self.SessionLocal() as session:
                # Estatísticas gerais
                general_stats = await session.execute(
                    text("""
                        SELECT 
                            COUNT(*) as total_logs,
                            MIN(created_at) as oldest_log,
                            MAX(created_at) as newest_log,
                            COUNT(DISTINCT user_id) as unique_users,
                            COUNT(DISTINCT action) as unique_actions
                        FROM audit_logs
                    """)
                )
                general = general_stats.fetchone()
                
                # Logs por período
                period_stats = await session.execute(
                    text("""
                        SELECT 
                            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24h,
                            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
                            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days,
                            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '6 months' THEN 1 END) as last_6_months
                        FROM audit_logs
                    """)
                )
                periods = period_stats.fetchone()
                
                # Logs que podem ser removidos (mais de 6 meses)
                cleanup_stats = await session.execute(
                    text("""
                        SELECT COUNT(*) as logs_to_cleanup
                        FROM audit_logs 
                        WHERE created_at < NOW() - INTERVAL '6 months'
                    """)
                )
                cleanup = cleanup_stats.fetchone()
                
                return {
                    "total_logs": general.total_logs if general else 0,
                    "oldest_log": general.oldest_log.isoformat() if general and general.oldest_log else None,
                    "newest_log": general.newest_log.isoformat() if general and general.newest_log else None,
                    "unique_users": general.unique_users if general else 0,
                    "unique_actions": general.unique_actions if general else 0,
                    "logs_by_period": {
                        "last_24h": periods.last_24h if periods else 0,
                        "last_7_days": periods.last_7_days if periods else 0,
                        "last_30_days": periods.last_30_days if periods else 0,
                        "last_6_months": periods.last_6_months if periods else 0
                    },
                    "logs_eligible_for_cleanup": cleanup.logs_to_cleanup if cleanup else 0
                }
                
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de auditoria: {e}")
            raise e
