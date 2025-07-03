#!/usr/bin/env python3
"""
Teste específico para verificar se a correção funcionou
"""
import asyncio
import sys
sys.path.insert(0, '/opt/bgpview/backend')

async def test_ping_fix():
    try:
        from app.core.config import SessionLocal
        from app.models.router import Router
        from sqlalchemy.future import select
        import paramiko
        import base64
        
        print("🔍 Testando correção do ping...")
        
        async with SessionLocal() as db:
            result = await db.execute(select(Router).filter(Router.is_active == True))
            router = result.scalars().first()
            
            if not router or not router.ip_origens:
                print("❌ Nenhum roteador com IPs de origem encontrado")
                return
            
            print(f"🔧 Testando: {router.name}")
            
            password = base64.b64decode(router.ssh_password.encode()).decode()
            source_ip = router.ip_origens[0].get("ip")
            
            # Teste com nova abordagem: uma conexão SSH por comando
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
            
            # Testar ping com timeout baixo
            ping_cmd = f"ping -c 3 -W 2 -a {source_ip} 8.8.8.8"
            print(f"🏓 Executando: {ping_cmd}")
            
            try:
                stdin, stdout, stderr = client.exec_command(ping_cmd, timeout=30)
                
                # Configurar timeouts nos canais
                stdout.channel.settimeout(30.0)
                stderr.channel.settimeout(30.0)
                
                output = stdout.read().decode('utf-8', errors='ignore')
                error = stderr.read().decode('utf-8', errors='ignore')
                exit_status = stdout.channel.recv_exit_status()
                
                print(f"✅ Ping executado (exit: {exit_status})")
                
                if output:
                    lines = output.split('\n')[:5]
                    for line in lines:
                        if line.strip():
                            print(f"   {line}")
                
                if error:
                    print(f"⚠️  Error: {error[:100]}")
                
            except paramiko.ChannelException as e:
                print(f"❌ ChannelException: {e}")
                print("   ℹ️  O roteador está bloqueando múltiplos canais SSH")
            except Exception as e:
                print(f"❌ Erro: {e}")
            
            client.close()
            print("🔒 Conexão fechada")
            
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ping_fix())
