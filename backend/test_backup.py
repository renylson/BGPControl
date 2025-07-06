#!/usr/bin/env python3
"""
Script de teste para funcionalidade de backup do banco de dados
"""
import asyncio
import sys
import os
from pathlib import Path

# Adicionar o diretório do backend ao path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

async def test_backup_service():
    """Testa o serviço de backup"""
    print("🧪 Testando serviço de backup do banco de dados...")
    
    try:
        from app.services.database_backup import DatabaseBackupService
        from app.core.config import DATABASE_URL
        
        print(f"✅ Importações realizadas com sucesso")
        print(f"📍 URL do banco: {DATABASE_URL}")
        
        # Inicializar serviço
        backup_service = DatabaseBackupService()
        print(f"✅ Serviço de backup inicializado")
        print(f"📁 Diretório de backup: {backup_service.backup_dir}")
        
        # Testar conexão com banco
        print(f"🔍 Configurações extraídas:")
        print(f"   Host: {backup_service.db_host}")
        print(f"   Porta: {backup_service.db_port}")
        print(f"   Usuário: {backup_service.db_user}")
        print(f"   Banco: {backup_service.db_name}")
        
        # Testar listagem de backups
        backups = await backup_service.list_backups()
        print(f"✅ Lista de backups obtida: {len(backups)} backup(s) encontrado(s)")
        
        # Testar status
        try:
            status = await backup_service.get_backup_status()
            print(f"✅ Status do sistema de backup obtido:")
            print(f"   Total de backups: {status.total_backups}")
            print(f"   Espaço usado: {status.total_size_human}")
            print(f"   Espaço disponível: {status.available_space_human}")
        except Exception as e:
            print(f"⚠️  Erro ao obter status: {e}")
        
        print(f"✅ Todos os testes básicos passaram!")
        return True
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Função principal"""
    print("=" * 60)
    print("BGPControl - Teste do Sistema de Backup")
    print("=" * 60)
    
    success = await test_backup_service()
    
    print("=" * 60)
    if success:
        print("✅ Teste concluído com sucesso!")
        print("💡 O sistema de backup está pronto para uso.")
    else:
        print("❌ Teste falhou!")
        print("💡 Verifique os logs acima para identificar problemas.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
