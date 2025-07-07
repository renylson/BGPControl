#!/usr/bin/env python3
"""
Script automatizado para limpeza de logs de auditoria BGPControl
Usado pelo cron job para limpeza automática
"""
import asyncio
import logging
import sys
import os
from datetime import datetime
from pathlib import Path

# Adicionar o diretório do app ao path
sys.path.append(os.path.dirname(__file__))

from app.services.audit_cleanup import AuditLogCleanupService

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/bgpcontrol_audit_cleanup.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

async def main():
    """Executa limpeza automática de logs de auditoria"""
    try:
        logger.info("Iniciando limpeza automática de logs de auditoria...")
        
        service = AuditLogCleanupService()
        
        # Obter estatísticas antes da limpeza
        stats_before = await service.get_audit_stats()
        logger.info(f"Logs antes da limpeza: {stats_before['total_logs']}")
        
        # Executar limpeza (manter últimos 6 meses)
        result = await service.cleanup_old_logs(months_to_keep=6)
        
        logger.info(f"Limpeza concluída: {result['deleted_count']} logs removidos")
        logger.info(f"Espaço liberado: {result['freed_space_mb']:.2f} MB")
        
        # Gerar relatório
        report_path = Path("/var/log/bgpcontrol") / f"audit_cleanup_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_path, 'w') as f:
            f.write(f"Relatório de Limpeza de Auditoria - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 60 + "\n")
            f.write(f"Logs removidos: {result['deleted_count']}\n")
            f.write(f"Espaço liberado: {result['freed_space_mb']:.2f} MB\n")
            f.write(f"Logs antes da limpeza: {stats_before['total_logs']}\n")
            f.write(f"Log mais antigo removido até: {result.get('oldest_removed_date', 'N/A')}\n")
            f.write(f"Log mais antigo restante: {result.get('oldest_remaining_date', 'N/A')}\n")
            f.write(f"Data da limpeza: {result['cleanup_date']}\n")
        
        logger.info(f"Relatório salvo em: {report_path}")
        
    except Exception as e:
        logger.error(f"Erro na limpeza automática: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
