#!/usr/bin/env python3
"""
BGPView - Script para Criar Usuário Administrador

Este script cria um usuário administrador no sistema BGPView.
Uso: python3 create_admin.py <username> <password> <name> <profile>
"""

import asyncio
import sys
import os
from pathlib import Path

# Adicionar o diretório do backend ao path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from app.core.config import engine
    from app.models.user import User
    from app.core.security import get_password_hash
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.future import select
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

async def create_admin_user(username, password, name, profile="Administrador"):
    """Cria um usuário administrador"""
    try:
        SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with SessionLocal() as session:
            # Verificar se usuário já existe
            result = await session.execute(
                select(User).where(User.username == username)
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                log_warning(f"Usuário '{username}' já existe")
                return False
            
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
            log_info(f"ID: {admin_user.id}")
            log_info(f"Nome: {admin_user.name}")
            log_info(f"Perfil: {admin_user.profile}")
            log_info(f"Ativo: {admin_user.is_active}")
            
            return True
            
    except Exception as e:
        log_error(f"Erro ao criar usuário administrador: {e}")
        return False

async def main():
    """Função principal"""
    if len(sys.argv) < 4:
        print("Uso: python3 create_admin.py <username> <password> <name> [profile]")
        print("Exemplo: python3 create_admin.py admin senha123 'Administrador' Administrador")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    name = sys.argv[3]
    profile = sys.argv[4] if len(sys.argv) > 4 else "Administrador"
    
    print("👤 BGPView - Criador de Usuário Administrador")
    print("=" * 50)
    
    log_info(f"Criando usuário: {username}")
    log_info(f"Nome: {name}")
    log_info(f"Perfil: {profile}")
    
    success = await create_admin_user(username, password, name, profile)
    
    if success:
        print("\n🎉 Usuário administrador criado com sucesso!")
        print(f"Use as credenciais: {username} / {password}")
    else:
        print("\n❌ Falha ao criar usuário administrador")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️  Operação cancelada pelo usuário")
        sys.exit(1)
    except Exception as e:
        log_error(f"Erro inesperado: {e}")
        sys.exit(1)
