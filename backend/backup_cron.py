#!/usr/bin/env python3
"""
Script automático para backup do banco de dados
Este script deve ser executado via cron para manter backups regulares
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime

# Adicionar o diretório do backend ao path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from app.services.database_backup import DatabaseBackupService
    import logging
    
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
    
except ImportError as e:
    print(f"❌ Erro ao importar módulos: {e}")
    print("Certifique-se de que o ambiente virtual está ativado")
    sys.exit(1)

async def main():
    """Função principal de backup automático"""
    try:
        logger.info("=== Iniciando backup automático do banco de dados ===")
        
        # Inicializar serviço de backup
        backup_service = DatabaseBackupService()
        
        # Obter configurações do ambiente
        backup_description = os.getenv('BACKUP_DESCRIPTION', f'Backup automático - {datetime.now().strftime("%Y-%m-%d %H:%M")}')
        days_to_keep = int(os.getenv('BACKUP_DAYS_TO_KEEP', '30'))
        
        logger.info(f"Descrição: {backup_description}")
        logger.info(f"Manter backups por: {days_to_keep} dias")
        
        # Criar backup
        logger.info("Criando backup...")
        backup_info = await backup_service.create_backup(
            created_by="Sistema (Cron)",
            description=backup_description
        )
        
        logger.info(f"✅ Backup criado com sucesso")
        logger.info(f"   Arquivo: {backup_info.filename}")
        logger.info(f"   Tamanho: {backup_info.size_human}")
        logger.info(f"   ID: {backup_info.id}")
        
        # Limpar backups antigos
        logger.info(f"Limpando backups antigos (mais de {days_to_keep} dias)...")
        removed_count = await backup_service.cleanup_old_backups(
            days_to_keep=days_to_keep,
            cleaned_by="Sistema (Cron)"
        )
        
        if removed_count > 0:
            logger.info(f"✅ Removidos {removed_count} backups antigos")
        else:
            logger.info("✅ Nenhum backup antigo para remover")
        
        # Obter status do sistema de backup
        status = await backup_service.get_backup_status()
        logger.info(f"Total de backups: {status.total_backups}")
        logger.info(f"Tamanho total: {status.total_size_human}")
        logger.info(f"Espaço disponível: {status.available_space_human}")
        
        # Criar relatório
        create_backup_report(backup_info, removed_count, status)
        
        logger.info("=== Backup automático concluído ===")
        
    except Exception as e:
        logger.error(f"❌ Erro no backup automático: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)

def create_backup_report(backup_info, removed_count, status):
    """Cria relatório do backup"""
    try:
        report_dir = Path("/var/log/bgpcontrol")
        report_dir.mkdir(exist_ok=True)
        
        report_file = report_dir / f"backup_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        with open(report_file, 'w') as f:
            f.write("=== RELATÓRIO DE BACKUP AUTOMÁTICO ===\n")
            f.write(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("BACKUP CRIADO:\n")
            f.write(f"  ID: {backup_info.id}\n")
            f.write(f"  Arquivo: {backup_info.filename}\n")
            f.write(f"  Tamanho: {backup_info.size_human} ({backup_info.size_bytes} bytes)\n")
            f.write(f"  Criado em: {backup_info.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"  Descrição: {backup_info.description}\n")
            f.write(f"  Compactado: Sim (.gz)\n\n")
            
            f.write("LIMPEZA DE BACKUPS ANTIGOS:\n")
            f.write(f"  Backups removidos: {removed_count}\n\n")
            
            f.write("STATUS DO SISTEMA:\n")
            f.write(f"  Total de backups: {status.total_backups}\n")
            f.write(f"  Tamanho total: {status.total_size_human}\n")
            f.write(f"  Diretório: {status.backup_directory}\n")
            f.write(f"  Espaço disponível: {status.available_space_human}\n")
            
            if status.oldest_backup:
                f.write(f"  Backup mais antigo: {status.oldest_backup.strftime('%Y-%m-%d %H:%M:%S')}\n")
            if status.newest_backup:
                f.write(f"  Backup mais recente: {status.newest_backup.strftime('%Y-%m-%d %H:%M:%S')}\n")
            
            f.write("\nSTATUS: CONCLUÍDO COM SUCESSO\n")
        
        logger.info(f"Relatório salvo em: {report_file}")
        
        # Manter apenas os últimos 30 relatórios
        cleanup_old_reports(report_dir)
        
    except Exception as e:
        logger.warning(f"Erro ao criar relatório: {e}")

def cleanup_old_reports(report_dir):
    """Remove relatórios antigos, mantendo apenas os 30 mais recentes"""
    try:
        reports = list(report_dir.glob("backup_report_*.txt"))
        reports.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        # Manter apenas os 30 mais recentes
        for old_report in reports[30:]:
            old_report.unlink()
            logger.info(f"Relatório antigo removido: {old_report.name}")
            
    except Exception as e:
        logger.warning(f"Erro ao limpar relatórios antigos: {e}")

def check_disk_space():
    """Verifica se há espaço suficiente em disco"""
    try:
        import shutil
        backup_dir = Path("/var/backups/bgpcontrol")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        usage = shutil.disk_usage(backup_dir)
        free_gb = usage.free / (1024**3)
        
        if free_gb < 1:  # Menos de 1GB livre
            logger.warning(f"⚠️  Pouco espaço em disco: {free_gb:.2f}GB livres")
            logger.warning("Considere limpar backups antigos manualmente")
        
        return free_gb > 0.5  # Pelo menos 500MB livres
        
    except Exception as e:
        logger.warning(f"Erro ao verificar espaço em disco: {e}")
        return True

if __name__ == "__main__":
    # Verificar se está rodando como usuário correto
    if os.getuid() == 0:
        logger.warning("⚠️  Executando como root - recomenda-se usar usuário bgpcontrol")
    
    # Verificar espaço em disco
    if not check_disk_space():
        logger.error("❌ Espaço em disco insuficiente para backup")
        sys.exit(1)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("⚠️  Backup cancelado pelo usuário")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Erro inesperado: {e}")
        sys.exit(1)
