#!/usr/bin/env python3
"""
Script para testar o novo comando de traceroute corrigido
"""

import asyncio
import sys
import os

# Adicionar o diretório do backend ao path
sys.path.append('/opt/bgpview/backend')

import paramiko
import base64
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.models.router import Router
from app.core.config import settings

def get_router_from_db():
    """Busca o primeiro roteador do banco de dados"""
    try:
        # Usar a string de conexão do settings
        engine = create_engine(settings.DATABASE_URL.replace('+asyncpg', ''))
        Session = sessionmaker(bind=engine)
        
        with Session() as session:
            router = session.execute(select(Router).filter(Router.is_active == True)).first()
            if router:
                return router[0]  # router é um tuple, pegar o primeiro elemento
            return None
    except Exception as e:
        print(f"Erro ao buscar roteador do banco: {e}")
        return None

def test_traceroute_commands():
    """Testa os novos comandos de traceroute"""
    router = get_router_from_db()
    if not router:
        print("❌ Nenhum roteador encontrado no banco de dados")
        return False
    
    print(f"🔍 Testando traceroute no roteador: {router.name} ({router.ip})")
    
    # Decodificar senha
    try:
        password = base64.b64decode(router.ssh_password.encode()).decode()
        print("✅ Senha decodificada com sucesso")
    except Exception as e:
        print(f"❌ Erro ao decodificar senha: {e}")
        return False
    
    # Conectar via SSH
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        print(f"🔗 Conectando via SSH a {router.ip}:{router.ssh_port}")
        client.connect(
            hostname=router.ip,
            port=router.ssh_port,
            username=router.ssh_user,
            password=password,
            timeout=10
        )
        print("✅ Conexão SSH estabelecida")
        
        # Buscar IP de origem para teste
        source_ip = None
        if router.ip_origens and len(router.ip_origens) > 0:
            source_ip = router.ip_origens[0].get("ip")
            print(f"🎯 Usando IP de origem: {source_ip}")
        
        # Alvos de teste
        targets = [
            "8.8.8.8",  # IPv4
            # "2001:4860:4860::8888",  # IPv6 - comentado para teste inicial
        ]
        
        for target in targets:
            is_ipv6 = ":" in target
            print(f"\n📡 Testando traceroute para {target} ({'IPv6' if is_ipv6 else 'IPv4'})")
            
            # Montar comando com a sintaxe correta
            if is_ipv6:
                if source_ip:
                    command = f"tracert ipv6 -a {source_ip} -w 1000 -q 1 -m 10 {target}"
                else:
                    command = f"tracert ipv6 -w 1000 -q 1 -m 10 {target}"
            else:
                if source_ip:
                    command = f"tracert -as -a {source_ip} -w 1000 -q 1 -m 10 {target}"
                else:
                    command = f"tracert -as -w 1000 -q 1 -m 10 {target}"
            
            print(f"🖥️  Comando: {command}")
            
            try:
                stdin, stdout, stderr = client.exec_command(command, timeout=30)
                
                # Configurar timeout nos canais
                stdout.channel.settimeout(30.0)
                stderr.channel.settimeout(30.0)
                
                output = stdout.read().decode('utf-8', errors='ignore')
                error = stderr.read().decode('utf-8', errors='ignore')
                exit_status = stdout.channel.recv_exit_status()
                
                print(f"📤 Exit status: {exit_status}")
                
                if output.strip():
                    print("📋 Output:")
                    print("-" * 50)
                    print(output[:500] + "..." if len(output) > 500 else output)
                    print("-" * 50)
                
                if error.strip():
                    print("⚠️  Stderr:")
                    print(error[:200] + "..." if len(error) > 200 else error)
                
                if exit_status == 0:
                    print(f"✅ Traceroute para {target} executado com sucesso")
                else:
                    print(f"⚠️  Traceroute para {target} terminou com código {exit_status}")
                    
            except Exception as e:
                print(f"❌ Erro ao executar traceroute para {target}: {e}")
        
        client.close()
        print("\n✅ Teste de traceroute concluído")
        return True
        
    except Exception as e:
        print(f"❌ Erro na conexão SSH: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Teste do comando de traceroute corrigido")
    print("=" * 60)
    
    success = test_traceroute_commands()
    
    if success:
        print("\n🎉 Teste concluído com sucesso!")
    else:
        print("\n💥 Teste falhou")
    
    print("=" * 60)
