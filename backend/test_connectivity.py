#!/usr/bin/env python3
"""
Script de teste para verificar conectividade SSH com roteadores
"""
import asyncio
import sys
import os

# Adicionar o diretório do projeto ao Python path
sys.path.insert(0, '/opt/bgpview/backend')

async def test_router_connectivity():
    try:
        from app.core.config import SessionLocal
        from app.models.router import Router
        from sqlalchemy.future import select
        import paramiko
        import base64
        import time
        
        print("🔍 Testando conectividade com roteadores...")
        
        async with SessionLocal() as db:
            # Buscar todos os roteadores ativos
            result = await db.execute(select(Router).filter(Router.is_active == True))
            routers = result.scalars().all()
            
            if not routers:
                print("❌ Nenhum roteador ativo encontrado no banco de dados")
                return
            
            print(f"📡 Encontrados {len(routers)} roteadores ativos")
            
            for router in routers:
                print(f"\n🔧 Testando roteador: {router.name} ({router.ip}:{router.ssh_port})")
                
                try:
                    # Decodificar senha
                    password = base64.b64decode(router.ssh_password.encode()).decode()
                    
                    # Conectar via SSH
                    client = paramiko.SSHClient()
                    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    
                    start_time = time.time()
                    client.connect(
                        hostname=router.ip,
                        port=router.ssh_port,
                        username=router.ssh_user,
                        password=password,
                        timeout=10
                    )
                    connection_time = time.time() - start_time
                    
                    print(f"  ✅ Conexão SSH OK - {connection_time:.2f}s")
                    
                    # Testar comando simples
                    command_start = time.time()
                    try:
                        stdin, stdout, stderr = client.exec_command("echo 'Teste'", timeout=5)
                        
                        # Aguardar o comando terminar
                        exit_status = stdout.channel.recv_exit_status()
                        
                        output = stdout.read().decode('utf-8', errors='ignore')
                        error = stderr.read().decode('utf-8', errors='ignore')
                        command_time = time.time() - command_start
                        
                        print(f"  ✅ Comando simples OK - {command_time:.2f}s (exit: {exit_status})")
                        if error:
                            print(f"     stderr: {error}")
                            
                    except Exception as cmd_error:
                        print(f"  ❌ Erro no comando simples: {cmd_error}")
                        command_time = time.time() - command_start
                    
                    # Testar comando ping com IP específico
                    source_ip = "170.78.6.242"  # IP específico conforme solicitado
                    print(f"  🏓 Testando ping com IP origem específico: {source_ip}")
                    
                    # Usar sintaxe correta do ping conforme especificado pelo usuário
                    ping_command = f"ping -c 3 -m 1 -a {source_ip} 8.8.8.8"
                    print(f"     Comando: {ping_command}")
                    
                    try:
                        ping_start = time.time()
                        stdin, stdout, stderr = client.exec_command(ping_command, timeout=15)
                        
                        # Aguardar o comando terminar
                        exit_status = stdout.channel.recv_exit_status()
                        
                        ping_output = stdout.read().decode('utf-8', errors='ignore')
                        ping_error = stderr.read().decode('utf-8', errors='ignore')
                        ping_time = time.time() - ping_start
                        
                        if ping_error:
                            print(f"  ⚠️  Ping com stderr: {ping_error[:200]}")
                        
                        print(f"  ✅ Ping executado - {ping_time:.2f}s (exit: {exit_status})")
                        # Mostrar as primeiras linhas do output
                        lines = ping_output.split('\n')[:8]
                        for line in lines:
                            if line.strip():
                                print(f"     {line}")
                                
                    except Exception as ping_error:
                        print(f"  ❌ Erro no ping: {ping_error}")
                        
                    # Testar também com outros IPs de origem do roteador (se existirem)
                    if router.ip_origens:
                        print(f"  📋 IPs de origem disponíveis no roteador:")
                        for ip_origem in router.ip_origens:
                            print(f"     ID: {ip_origem.get('id')} - IP: {ip_origem.get('ip')} - Nome: {ip_origem.get('name', 'N/A')}")
                        
                        # Verificar se o IP específico está na lista
                        found_ip = False
                        for ip_origem in router.ip_origens:
                            if ip_origem.get("ip") == source_ip:
                                found_ip = True
                                print(f"  ✅ IP {source_ip} encontrado na configuração do roteador (ID: {ip_origem.get('id')})")
                                break
                        
                        if not found_ip:
                            print(f"  ⚠️  IP {source_ip} NÃO está configurado neste roteador")
                    
                    # Fechar conexão de forma mais segura
                    try:
                        client.close()
                        print(f"  🔒 Conexão fechada")
                    except Exception as close_error:
                        print(f"  ⚠️  Erro ao fechar conexão: {close_error}")
                    
                except paramiko.AuthenticationException as e:
                    print(f"  ❌ Erro de autenticação: {e}")
                except paramiko.SSHException as e:
                    print(f"  ❌ Erro SSH: {e}")
                except Exception as e:
                    print(f"  ❌ Erro geral: {e}")
                    
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_router_connectivity())
