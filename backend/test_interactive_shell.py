#!/usr/bin/env python3
"""
Teste usando shell interativo para contornar problemas de exec_command
"""
import asyncio
import sys
import time
import select
import socket
sys.path.insert(0, '/opt/bgpview/backend')

async def test_interactive_shell():
    try:
        from app.core.config import SessionLocal
        from app.models.router import Router
        from sqlalchemy.future import select
        import paramiko
        import base64
        
        print("🐚 Teste com shell interativo")
        print("   Comando: ping -c 3 -m 1 -a 170.78.6.242 8.8.8.8")
        print("=" * 60)
        
        async with SessionLocal() as db:
            result = await db.execute(select(Router).filter(Router.is_active == True))
            router = result.scalars().first()
            
            if not router:
                print("❌ Nenhum roteador encontrado")
                return
            
            print(f"🔧 Roteador: {router.name} ({router.ip}:{router.ssh_port})")
            
            password = base64.b64decode(router.ssh_password.encode()).decode()
            
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            print("📡 Conectando via SSH...")
            client.connect(
                hostname=router.ip,
                port=router.ssh_port,
                username=router.ssh_user,
                password=password,
                timeout=10
            )
            print("✅ Conectado!")
            
            print("🐚 Abrindo shell interativo...")
            shell = client.invoke_shell()
            shell.settimeout(2.0)
            
            # Aguardar prompt inicial
            time.sleep(3)
            try:
                initial = shell.recv(2048).decode('utf-8', errors='ignore')
                print(f"📟 Prompt inicial: {repr(initial[-100:])}")
            except:
                print("📟 Nenhum prompt inicial recebido")
            
            # Enviar comando ping
            source_ip = "170.78.6.242"
            target_ip = "8.8.8.8"
            command = f"ping -c 3 -m 1 -a {source_ip} {target_ip}\n"
            
            print(f"\n🚀 Enviando comando: {command.strip()}")
            shell.send(command)
            
            print("⏳ Aguardando resultado...")
            
            # Coletar output durante 20 segundos
            output = ""
            start_time = time.time()
            timeout = 20.0
            
            while time.time() - start_time < timeout:
                try:
                    shell.settimeout(1.0)
                    chunk = shell.recv(1024).decode('utf-8', errors='ignore')
                    if chunk:
                        output += chunk
                        print(f"📥 Recebido {len(chunk)} chars: {repr(chunk[:50])}")
                        
                        # Verificar se o comando terminou
                        if "3 packets transmitted" in output or "ping: " in output.lower():
                            print("✅ Comando ping parece ter terminado")
                            break
                    else:
                        time.sleep(0.5)
                except socket.timeout:
                    # Timeout normal, continuar aguardando
                    pass
                except Exception as e:
                    print(f"📥 Erro ao receber dados: {e}")
                    break
            
            execution_time = time.time() - start_time
            print(f"\n📊 Coleta finalizada após {execution_time:.2f}s")
            print(f"📏 Total coletado: {len(output)} caracteres")
            
            print("\n📋 OUTPUT COMPLETO:")
            print("-" * 50)
            if output:
                print(output)
            else:
                print("(Nenhum output coletado)")
            
            # Enviar Ctrl+C para interromper qualquer comando pendente
            shell.send('\x03')
            time.sleep(1)
            
            # Tentar coletar mais output
            try:
                final_output = shell.recv(1024).decode('utf-8', errors='ignore')
                if final_output:
                    print("\n📋 OUTPUT FINAL:")
                    print("-" * 50)
                    print(final_output)
            except:
                pass
            
            shell.close()
            client.close()
            print("\n🔒 Conexão fechada")
            print("✅ Teste concluído!")
            
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_interactive_shell())
