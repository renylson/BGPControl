#!/usr/bin/env python3
"""
Script automatizado para backup do banco de dados BGPControl
Usado pelo cron job para backups automáticos
"""
import asyncio
import logging
import sys
import os
from datetime import datetime
from pathlib import Path

# Adicionar o diretório do app ao path
sys.path.append(os.path.dirname(__file__))

from app.services.database_backup import DatabaseBackupService

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/bgpcontrol_backup.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

async def main():
    """Executa backup automático"""
    try:
        logger.info("Iniciando backup automático...")
        
        service = DatabaseBackupService()
        backup_info = await service.create_backup(
            created_by="sistema_automatico",
            description="Backup automático diário"
        )
        
        logger.info(f"Backup criado com sucesso: {backup_info.filename}")
        logger.info(f"Tamanho: {backup_info.size_human}")
        
        # Gerar relatório
        report_path = Path("/var/log/bgpcontrol") / f"backup_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_path, 'w') as f:
            f.write(f"Relatório de Backup - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 50 + "\n")
            f.write(f"Arquivo: {backup_info.filename}\n")
            f.write(f"Tamanho: {backup_info.size_human}\n")
            f.write(f"Criado por: {backup_info.created_by}\n")
            f.write(f"Data: {backup_info.created_at}\n")
            if backup_info.description:
                f.write(f"Descrição: {backup_info.description}\n")
        
        logger.info(f"Relatório salvo em: {report_path}")
        
    except Exception as e:
        logger.error(f"Erro no backup automático: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
