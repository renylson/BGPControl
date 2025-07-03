#!/usr/bin/env python3
"""
Teste específico do comando ping com IP de origem 170.78.6.242
"""
import asyncio
import sys
import time
sys.path.insert(0, '/opt/bgpview/backend')

async def test_specific_ping():
    try:
        from app.core.config import SessionLocal
        from app.models.router import Router
        from sqlalchemy.future import select
        import paramiko
        import base64
        
        print("🏓 Teste específico do comando ping")
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
            start_connect = time.time()
            client.connect(
                hostname=router.ip,
                port=router.ssh_port,
                username=router.ssh_user,
                password=password,
                timeout=10
            )
            connect_time = time.time() - start_connect
            print(f"✅ Conectado em {connect_time:.2f}s")
            
            # Comando ping específico
            source_ip = "170.78.6.242"
            target_ip = "8.8.8.8"
            ping_command = f"ping -c 3 -m 1 -a {source_ip} {target_ip}"
            
            print(f"\n🚀 Executando comando:")
            print(f"   {ping_command}")
            
            try:
                start_ping = time.time()
                
                # Executar com timeout de 30 segundos
                stdin, stdout, stderr = client.exec_command(ping_command, timeout=30)
                
                # Configurar timeout nos canais
                stdout.channel.settimeout(30.0)
                stderr.channel.settimeout(30.0)
                
                print("⏳ Aguardando resultado...")
                
                # Ler saída
                output = stdout.read().decode('utf-8', errors='ignore')
                error = stderr.read().decode('utf-8', errors='ignore')
                
                # Aguardar status de saída
                exit_status = stdout.channel.recv_exit_status()
                
                ping_time = time.time() - start_ping
                
                print(f"✅ Comando executado em {ping_time:.2f}s")
                print(f"📊 Exit status: {exit_status}")
                print(f"📏 Output: {len(output)} caracteres")
                print(f"📏 Error: {len(error)} caracteres")
                
                print("\n📋 RESULTADO DO PING:")
                print("-" * 50)
                if output:
                    print(output)
                else:
                    print("(Nenhuma saída no stdout)")
                
                if error:
                    print("\n⚠️  STDERR:")
                    print("-" * 50)
                    print(error)
                
                # Análise do resultado
                print("\n📈 ANÁLISE:")
                if exit_status == 0:
                    print("✅ Ping executado com sucesso (exit code 0)")
                else:
                    print(f"❌ Ping falhou (exit code {exit_status})")
                
                if "packets transmitted" in output:
                    print("✅ Estatísticas de ping encontradas")
                elif "PING" in output:
                    print("✅ Comando ping iniciado")
                else:
                    print("⚠️  Saída inesperada do comando ping")
                
            except Exception as ping_error:
                ping_time = time.time() - start_ping
                print(f"❌ Erro ao executar ping após {ping_time:.2f}s: {ping_error}")
                print(f"   Tipo do erro: {type(ping_error).__name__}")
            
            print("\n🔒 Fechando conexão...")
            client.close()
            print("✅ Teste concluído!")
            
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_specific_ping())
