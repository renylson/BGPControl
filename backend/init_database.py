#!/usr/bin/env python3
"""
BGPControl - Script de Inicialização do Banco de Dados

Este script inicializa o banco de dados do BGPControl criando todas as tabelas
necessárias e dados iniciais opcionais.
"""

import asyncio
import sys
import os
from pathlib import Path

# Adicionar o diretório do backend ao path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from app.core.config import engine, DATABASE_URL
    from app.models.user import Base, User
    from app.models.router import Router
    from app.models.peering import Peering
    from app.models.peering_group import PeeringGroup, peering_group_association
    from app.core.security import get_password_hash
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
except ImportError as e:
    print(f"❌ Erro ao importar módulos: {e}")
    print("Certifique-se de que o ambiente virtual está ativado e as dependências instaladas.")
    sys.exit(1)

def log_info(message):
    print(f"ℹ️  {message}")

def log_success(message):
    print(f"✅ {message}")

def log_error(message):
    print(f"❌ {message}")

def log_warning(message):
    print(f"⚠️  {message}")

async def check_database_connection():
    """Verifica se a conexão com o banco está funcionando"""
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            log_success(f"Conexão com PostgreSQL estabelecida")
            log_info(f"Versão: {version}")
            return True
    except Exception as e:
        log_error(f"Erro na conexão com o banco: {e}")
        log_error(f"URL do banco: {DATABASE_URL}")
        return False

async def create_tables():
    """Cria todas as tabelas necessárias"""
    try:
        log_info("Criando tabelas do banco de dados...")
        
        # Importar todos os modelos para garantir que estão registrados
        from app.models import user, router, peering, peering_group
        
        async with engine.begin() as conn:
            # Criar todas as tabelas
            await conn.run_sync(Base.metadata.create_all)
            
        log_success("Todas as tabelas criadas com sucesso!")
        
        # Listar tabelas criadas
        await list_tables()
        
        return True
    except Exception as e:
        log_error(f"Erro ao criar tabelas: {e}")
        return False

async def list_tables():
    """Lista as tabelas criadas no banco"""
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                ORDER BY tablename
            """))
            tables = result.fetchall()
            
            if tables:
                log_info("Tabelas criadas:")
                for table in tables:
                    print(f"  • {table[0]}")
            else:
                log_warning("Nenhuma tabela encontrada")
                
    except Exception as e:
        log_warning(f"Não foi possível listar tabelas: {e}")

async def check_tables_exist():
    """Verifica se todas as tabelas necessárias existem"""
    expected_tables = [
        'users',
        'routers', 
        'peerings',
        'peering_groups',
        'peering_group_association'
    ]
    
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
            """))
            existing_tables = [row[0] for row in result.fetchall()]
            
            missing_tables = []
            for table in expected_tables:
                if table in existing_tables:
                    log_success(f"Tabela '{table}' existe")
                else:
                    missing_tables.append(table)
                    log_error(f"Tabela '{table}' não encontrada")
            
            if missing_tables:
                log_error(f"Tabelas faltando: {', '.join(missing_tables)}")
                return False
            else:
                log_success("Todas as tabelas necessárias estão presentes")
                return True
                
    except Exception as e:
        log_error(f"Erro ao verificar tabelas: {e}")
        return False

async def create_admin_user(username="admin", password="admin123", name="Administrador", profile="admin"):
    """Cria usuário administrador inicial se não existir"""
    try:
        SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with SessionLocal() as session:
            # Verificar se usuário já existe
            from sqlalchemy.future import select
            result = await session.execute(
                select(User).where(User.username == username)
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                log_info(f"Usuário '{username}' já existe")
                return True
            
            # Criar novo usuário
            log_info(f"Criando usuário administrador: {username}")
            hashed_password = get_password_hash(password)
            
            admin_user = User(
                username=username,
                hashed_password=hashed_password,
                name=name,
                profile=profile,
                is_active=True
            )
            
            session.add(admin_user)
            await session.commit()
            await session.refresh(admin_user)
            
            log_success(f"Usuário administrador '{username}' criado com sucesso")
            return True
            
    except Exception as e:
        log_error(f"Erro ao criar usuário administrador: {e}")
        return False

async def verify_database_integrity():
    """Verifica a integridade do banco de dados"""
    log_info("Verificando integridade do banco de dados...")
    
    try:
        SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with SessionLocal() as session:
            # Contar registros em cada tabela
            from sqlalchemy.future import select
            from sqlalchemy import func
            
            tables_info = [
                (User, "Usuários"),
                (Router, "Roteadores"),
                (Peering, "Peerings"),
                (PeeringGroup, "Grupos de Peering")
            ]
            
            for model, name in tables_info:
                result = await session.execute(select(func.count(model.id)))
                count = result.scalar()
                log_info(f"{name}: {count} registro(s)")
        
        log_success("Verificação de integridade concluída")
        return True
        
    except Exception as e:
        log_error(f"Erro na verificação de integridade: {e}")
        return False

async def main():
    """Função principal"""
    print("🗄️  BGPControl - Inicializador do Banco de Dados")
    print("=" * 50)
    
    # Verificar conexão
    if not await check_database_connection():
        sys.exit(1)
    
    # Criar tabelas
    if not await create_tables():
        sys.exit(1)
    
    # Verificar se tabelas existem
    if not await check_tables_exist():
        sys.exit(1)
    
    # Criar usuário admin se fornecido via argumentos
    if len(sys.argv) >= 4:
        username = sys.argv[1]
        password = sys.argv[2]
        name = sys.argv[3]
        profile = sys.argv[4] if len(sys.argv) > 4 else "admin"
        
        if not await create_admin_user(username, password, name, profile):
            log_warning("Falha ao criar usuário administrador")
    
    # Verificar integridade
    await verify_database_integrity()
    
    print("\n🎉 Inicialização do banco de dados concluída com sucesso!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️  Inicialização cancelada pelo usuário")
        sys.exit(1)
    except Exception as e:
        log_error(f"Erro inesperado: {e}")
        sys.exit(1)
