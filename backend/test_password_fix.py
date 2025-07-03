#!/usr/bin/env python3
"""
Teste para verificar se a correção da dupla codificação está funcionando
"""
import asyncio
import sys
sys.path.insert(0, '/opt/bgpview/backend')

async def test_password_fix():
    try:
        from app.core.config import SessionLocal
        from app.models.router import Router
        from sqlalchemy.future import select
        import base64
        
        print("🔧 Teste de correção da dupla codificação de senha")
        print("=" * 60)
        
        async with SessionLocal() as db:
            result = await db.execute(select(Router).filter(Router.is_active == True))
            router = result.scalars().first()
            
            if not router:
                print("❌ Nenhum roteador encontrado")
                return
            
            print(f"🔧 Roteador: {router.name}")
            print(f"📍 IP: {router.ip}")
            
            # Mostrar senha atual (duplamente codificada)
            print(f"🔐 Senha atual no banco (possivelmente dupla codificação): {router.ssh_password}")
            
            # Tentar decodificar uma vez
            try:
                first_decode = base64.b64decode(router.ssh_password.encode()).decode()
                print(f"🔓 Primeira decodificação: '{first_decode}'")
                
                # Verificar se ainda parece ser base64
                if first_decode.replace('+', '').replace('/', '').replace('=', '').isalnum():
                    print("🔍 Parece ainda estar codificado, tentando segunda decodificação...")
                    try:
                        second_decode = base64.b64decode(first_decode.encode()).decode()
                        print(f"🔓 Segunda decodificação (senha real): '{second_decode}'")
                        
                        # Atualizar a senha para a versão corretamente codificada
                        correct_encoded = base64.b64encode(second_decode.encode()).decode()
                        print(f"✅ Senha corretamente codificada seria: {correct_encoded}")
                        
                        # CORREÇÃO: Atualizar diretamente no banco com a senha correta
                        print(f"\n🛠️  Corrigindo senha no banco de dados...")
                        router.ssh_password = correct_encoded
                        await db.commit()
                        print(f"✅ Senha corrigida no banco de dados!")
                        
                        # Verificar se a correção funcionou
                        await db.refresh(router)
                        test_decode = base64.b64decode(router.ssh_password.encode()).decode()
                        print(f"🧪 Teste pós-correção: '{test_decode}'")
                        
                        if test_decode == second_decode:
                            print(f"✅ Correção bem-sucedida! Senha agora está corretamente codificada.")
                        else:
                            print(f"❌ Algo deu errado na correção.")
                        
                    except Exception as e:
                        print(f"❌ Erro na segunda decodificação: {e}")
                        print(f"🔍 A primeira decodificação pode já ser a senha real: '{first_decode}'")
                else:
                    print(f"🔍 A primeira decodificação já parece ser a senha real: '{first_decode}'")
                    
            except Exception as e:
                print(f"❌ Erro ao decodificar: {e}")
            
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_password_fix())
