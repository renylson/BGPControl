#!/usr/bin/env python3
import os
import sys
import asyncio
import asyncpg

async def alter_audit_logs_table():
    # Ler configurações do banco
    database_url = os.getenv('DATABASE_URL', 'postgresql://bgpview_user:bgpview_pass@localhost/bgpview_db')
    
    # Extrair parâmetros da URL
    from urllib.parse import urlparse
    parsed = urlparse(database_url)
    
    # Conectar ao banco
    conn = await asyncpg.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        database=parsed.path[1:]  # Remove leading slash
    )
    
    try:
        # Alterar a coluna para permitir NULL
        await conn.execute('ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL')
        print("✓ Coluna user_id alterada para permitir valores nulos")
        
        # Verificar se a alteração foi aplicada
        result = await conn.fetchrow("""
            SELECT is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'audit_logs' AND column_name = 'user_id'
        """)
        
        if result and result['is_nullable'] == 'YES':
            print("✓ Verificação confirmada: user_id agora permite valores nulos")
        else:
            print("✗ Erro: alteração não foi aplicada corretamente")
            
    except Exception as e:
        print(f"✗ Erro ao alterar tabela: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(alter_audit_logs_table())
