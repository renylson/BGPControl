#!/usr/bin/env python3
"""
Teste específico para diagnosticar problemas de SSH com timeout
"""
import asyncio
import sys
import os
import signal

sys.path.insert(0, '/opt/bgpview/backend')

def timeout_handler(signum, frame):
    raise TimeoutError("Operação excedeu o tempo limite")

async def test_ssh_issue():
    try:
        from app.core.config import SessionLocal
        from app.models.router import Router
        from sqlalchemy.future import select
        import paramiko
        import base64
        import time
        import threading
        
        print("🔍 Diagnóstico detalhado de problema SSH...")
        
        async with SessionLocal() as db:
            result = await db.execute(select(Router).filter(Router.is_active == True))
            routers = result.scalars().all()
            
            if not routers:
                print("❌ Nenhum roteador encontrado")
                return
            
            router = routers[0]  # Testar apenas o primeiro
            print(f"🔧 Testando: {router.name} ({router.ip}:{router.ssh_port})")
            
            password = base64.b64decode(router.ssh_password.encode()).decode()
            
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            print("📡 Conectando...")
            client.connect(
                hostname=router.ip,
                port=router.ssh_port,
                username=router.ssh_user,
                password=password,
                timeout=10
            )
            print("✅ Conectado!")
            
            # Teste 1: Comando muito simples com timeout baixo
            print("\n🧪 Teste 1: Comando básico")
            try:
                stdin, stdout, stderr = client.exec_command("whoami", timeout=5)
                
                # Configurar timeout para leitura
                stdout.channel.settimeout(5.0)
                stderr.channel.settimeout(5.0)
                
                output = stdout.read().decode('utf-8', errors='ignore')
                error = stderr.read().decode('utf-8', errors='ignore')
                exit_status = stdout.channel.recv_exit_status()
                
                print(f"   Output: '{output.strip()}'")
                print(f"   Error: '{error.strip()}'")
                print(f"   Exit: {exit_status}")
                
            except Exception as e:
                print(f"   ❌ Erro: {e}")
            
            # Teste 2: Verificar se o shell está interativo
            print("\n🧪 Teste 2: Verificar shell")
            try:
                stdin, stdout, stderr = client.exec_command("echo $0", timeout=5)
                stdout.channel.settimeout(5.0)
                
                output = stdout.read().decode('utf-8', errors='ignore')
                exit_status = stdout.channel.recv_exit_status()
                
                print(f"   Shell: '{output.strip()}'")
                print(f"   Exit: {exit_status}")
                
            except Exception as e:
                print(f"   ❌ Erro: {e}")
            
            # Teste 3: Comando ping com timeout muito baixo
            print("\n🧪 Teste 3: Ping rápido")
            try:
                if router.ip_origens:
                    source_ip = router.ip_origens[0].get("ip")
                    ping_cmd = f"ping -c 1 -W 1 -a {source_ip} 8.8.8.8"
                    print(f"   Comando: {ping_cmd}")
                    
                    stdin, stdout, stderr = client.exec_command(ping_cmd, timeout=10)
                    stdout.channel.settimeout(10.0)
                    stderr.channel.settimeout(10.0)
                    
                    output = stdout.read().decode('utf-8', errors='ignore')
                    error = stderr.read().decode('utf-8', errors='ignore')
                    exit_status = stdout.channel.recv_exit_status()
                    
                    print(f"   Output length: {len(output)}")
                    print(f"   Error length: {len(error)}")
                    print(f"   Exit: {exit_status}")
                    
                    if output:
                        lines = output.split('\n')[:3]
                        for line in lines:
                            if line.strip():
                                print(f"     {line}")
                    
                    if error:
                        print(f"   Error: {error[:200]}")
                
            except Exception as e:
                print(f"   ❌ Erro: {e}")
            
            print("\n🔒 Fechando conexão...")
            client.close()
            print("✅ Teste concluído!")
            
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ssh_issue())
