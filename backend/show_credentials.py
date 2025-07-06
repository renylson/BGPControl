#!/usr/bin/env python3
"""
Teste para mostrar as credenciais que estão sendo enviadas para o roteador
"""
import asyncio
import sys
sys.path.insert(0, '/opt/bgpcontrol/backend')

async def show_credentials():
    try:
        from app.core.config import SessionLocal
        from app.models.router import Router
        from sqlalchemy.future import select
        import base64
        
        print("🔍 Verificando credenciais do roteador")
        print("=" * 60)
        
        async with SessionLocal() as db:
            result = await db.execute(select(Router).filter(Router.is_active == True))
            router = result.scalars().first()
            
            if not router:
                print("❌ Nenhum roteador encontrado")
                return
            
            print(f"🔧 Roteador: {router.name}")
            print(f"📍 IP: {router.ip}")
            print(f"🚪 Porta SSH: {router.ssh_port}")
            print(f"👤 Usuário SSH: {router.ssh_user}")
            
            # Mostrar senha criptografada
            print(f"🔐 Senha criptografada (base64): {router.ssh_password}")
            
            # Decodificar e mostrar senha real
            try:
                password = base64.b64decode(router.ssh_password.encode()).decode()
                print(f"🔓 Senha decodificada: '{password}'")
                print(f"📏 Tamanho da senha: {len(password)} caracteres")
                
                # Mostrar caracteres especiais se houver
                special_chars = []
                for i, char in enumerate(password):
                    if not char.isalnum():
                        special_chars.append(f"pos {i}: '{char}' (ASCII {ord(char)})")
                
                if special_chars:
                    print(f"⚠️  Caracteres especiais na senha:")
                    for sc in special_chars:
                        print(f"     {sc}")
                else:
                    print("✅ Senha contém apenas caracteres alfanuméricos")
                
            except Exception as decode_error:
                print(f"❌ Erro ao decodificar senha: {decode_error}")
            
            print(f"\n📊 Outras informações:")
            print(f"ASN: {router.asn}")
            print(f"Ativo: {router.is_active}")
            print(f"Nota: {router.note}")
            
            # Mostrar IPs de origem
            if router.ip_origens:
                print(f"\n📋 IPs de origem configurados:")
                for ip_origem in router.ip_origens:
                    print(f"     ID: {ip_origem.get('id')} - IP: {ip_origem.get('ip')} - Nome: {ip_origem.get('name', 'N/A')} - Tipo: {ip_origem.get('type', 'N/A')}")
            else:
                print(f"\n⚠️  Nenhum IP de origem configurado")
            
            print(f"\n🔧 Comando de conexão SSH que seria usado:")
            print(f"ssh -p {router.ssh_port} {router.ssh_user}@{router.ip}")
            
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(show_credentials())
