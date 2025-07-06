#!/usr/bin/env python3
"""
Script automático para limpeza de logs de auditoria antigos
Este script deve ser executado via cron para manter o banco limpo
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
    from app.services.audit_cleanup import AuditLogCleanupService
    import logging
    
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
    
except ImportError as e:
    print(f"❌ Erro ao importar módulos: {e}")
    print("Certifique-se de que o ambiente virtual está ativado")
    sys.exit(1)

async def main():
    """Função principal de limpeza automática"""
    try:
        logger.info("=== Iniciando limpeza automática de logs de auditoria ===")
        
        # Inicializar serviço de limpeza
        cleanup_service = AuditLogCleanupService()
        
        # Obter estatísticas antes da limpeza
        logger.info("Obtendo estatísticas dos logs...")
        stats_before = await cleanup_service.get_audit_stats()
        
        logger.info(f"Total de logs: {stats_before['total_logs']}")
        logger.info(f"Logs elegíveis para limpeza: {stats_before['logs_eligible_for_cleanup']}")
        
        # Executar limpeza (manter últimos 6 meses)
        months_to_keep = int(os.getenv('AUDIT_CLEANUP_MONTHS', '6'))
        logger.info(f"Mantendo logs dos últimos {months_to_keep} meses")
        
        if stats_before['logs_eligible_for_cleanup'] > 0:
            result = await cleanup_service.cleanup_old_logs(months_to_keep)
            
            if result['success']:
                logger.info(f"✅ Limpeza concluída com sucesso")
                logger.info(f"   Logs removidos: {result['logs_removed']}")
                logger.info(f"   Data limite: {result['cutoff_date']}")
                
                # Estatísticas após limpeza
                stats_after = result.get('stats_after', {})
                logger.info(f"   Logs restantes: {stats_after.get('total_logs', 0)}")
                
                # Criar relatório
                create_cleanup_report(result, stats_before)
                
            else:
                logger.error("❌ Falha na limpeza")
                sys.exit(1)
        else:
            logger.info("✅ Nenhum log antigo encontrado - limpeza não necessária")
        
        logger.info("=== Limpeza automática concluída ===")
        
    except Exception as e:
        logger.error(f"❌ Erro na limpeza automática: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)

def create_cleanup_report(cleanup_result, stats_before):
    """Cria relatório da limpeza"""
    try:
        report_dir = Path("/var/log/bgpcontrol")
        report_dir.mkdir(exist_ok=True)
        
        report_file = report_dir / f"audit_cleanup_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        with open(report_file, 'w') as f:
            f.write("=== RELATÓRIO DE LIMPEZA DE LOGS DE AUDITORIA ===\n")
            f.write(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("ESTATÍSTICAS ANTES DA LIMPEZA:\n")
            f.write(f"  Total de logs: {stats_before['total_logs']}\n")
            f.write(f"  Log mais antigo: {stats_before.get('oldest_log', 'N/A')}\n")
            f.write(f"  Log mais recente: {stats_before.get('newest_log', 'N/A')}\n")
            f.write(f"  Logs elegíveis para limpeza: {stats_before['logs_eligible_for_cleanup']}\n\n")
            
            f.write("RESULTADO DA LIMPEZA:\n")
            f.write(f"  Logs removidos: {cleanup_result['logs_removed']}\n")
            f.write(f"  Data limite: {cleanup_result['cutoff_date']}\n")
            
            stats_after = cleanup_result.get('stats_after', {})
            f.write(f"  Logs restantes: {stats_after.get('total_logs', 0)}\n")
            f.write(f"  Novo log mais antigo: {stats_after.get('oldest_log', 'N/A')}\n\n")
            
            f.write("STATUS: CONCLUÍDO COM SUCESSO\n")
        
        logger.info(f"Relatório salvo em: {report_file}")
        
        # Manter apenas os últimos 10 relatórios
        cleanup_old_reports(report_dir)
        
    except Exception as e:
        logger.warning(f"Erro ao criar relatório: {e}")

def cleanup_old_reports(report_dir):
    """Remove relatórios antigos, mantendo apenas os 10 mais recentes"""
    try:
        reports = list(report_dir.glob("audit_cleanup_report_*.txt"))
        reports.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        # Manter apenas os 10 mais recentes
        for old_report in reports[10:]:
            old_report.unlink()
            logger.info(f"Relatório antigo removido: {old_report.name}")
            
    except Exception as e:
        logger.warning(f"Erro ao limpar relatórios antigos: {e}")

if __name__ == "__main__":
    # Verificar se está rodando como usuário correto
    if os.getuid() == 0:
        logger.warning("⚠️  Executando como root - recomenda-se usar usuário bgpcontrol")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("⚠️  Limpeza cancelada pelo usuário")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Erro inesperado: {e}")
        sys.exit(1)
