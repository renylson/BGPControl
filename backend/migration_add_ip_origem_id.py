#!/usr/bin/env python3

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def add_ip_origem_id_column():
    # Parse DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL não encontrada no .env")
        return
    
    # Extract connection info from DATABASE_URL
    # Format: postgresql+asyncpg://user:password@host/database
    url_parts = database_url.replace("postgresql+asyncpg://", "").split("@")
    user_pass = url_parts[0].split(":")
    host_db = url_parts[1].split("/")
    
    user = user_pass[0]
    password = user_pass[1].replace("%40", "@").replace("%23", "#")  # Decode URL encoding
    host = host_db[0]
    database = host_db[1]
    
    conn = await asyncpg.connect(
        user=user,
        password=password,
        database=database,
        host=host
    )
    
    try:
        # Check if column already exists
        result = await conn.fetch("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'peerings' AND column_name = 'ip_origem_id'
        """)
        
        if result:
            print("Coluna ip_origem_id já existe na tabela peerings")
        else:
            # Add the column
            await conn.execute("""
                ALTER TABLE peerings ADD COLUMN ip_origem_id VARCHAR NULL
            """)
            print("Coluna ip_origem_id adicionada com sucesso à tabela peerings")
            
    except Exception as e:
        print(f"Erro ao executar migração: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(add_ip_origem_id_column())
