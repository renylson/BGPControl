#!/usr/bin/env python3
"""
Teste com invoke_shell para contornar limitações de exec_command
"""
import asyncio
import sys
import time
sys.path.insert(0, '/opt/bgpview/backend')

async def test_shell_approach():
    try:
        from app.core.config import SessionLocal
        from app.models.router import Router
        from sqlalchemy.future import select
        import paramiko
        import base64
        
        print("🔍 Testando abordagem com shell interativo...")
        
        async with SessionLocal() as db:
            result = await db.execute(select(Router).filter(Router.is_active == True))
            router = result.scalars().first()
            
            if not router or not router.ip_origens:
                print("❌ Nenhum roteador encontrado")
                return
            
            print(f"🔧 Testando: {router.name}")
            
            password = base64.b64decode(router.ssh_password.encode()).decode()
            source_ip = router.ip_origens[0].get("ip")
            
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
            
            # Tentar usar shell interativo
            print("🐚 Abrindo shell...")
            shell = client.invoke_shell()
            shell.settimeout(5.0)
            
            # Aguardar prompt inicial
            time.sleep(2)
            initial_output = shell.recv(1024).decode('utf-8', errors='ignore')
            print(f"   Prompt inicial: {repr(initial_output[-50:])}")
            
            # Enviar comando ping simples
            ping_cmd = f"ping -c 3 -W 1 -a {source_ip} 8.8.8.8\n"
            print(f"🏓 Enviando comando: {ping_cmd.strip()}")
            shell.send(ping_cmd)
            
            # Aguardar resultado
            time.sleep(5)
            output = ""
            try:
                while True:
                    chunk = shell.recv(1024).decode('utf-8', errors='ignore')
                    if not chunk:
                        break
                    output += chunk
                    if len(output) > 5000:  # Limite de segurança
                        break
            except:
                pass
            
            print(f"✅ Recebido {len(output)} caracteres")
            
            if output:
                lines = output.split('\n')[:10]
                for i, line in enumerate(lines):
                    if line.strip():
                        print(f"   {i+1}: {line}")
            
            shell.close()
            client.close()
            print("🔒 Conexão fechada")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_shell_approach())
