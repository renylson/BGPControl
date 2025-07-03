#!/usr/bin/env python3
"""
Migration para alterar ip_origem_id de STRING para INTEGER
"""

import sys
import os
sys.path.append('/opt/bgpview/backend')

import asyncio
from sqlalchemy import text
from app.core.config import SessionLocal

async def main():
    async with SessionLocal() as db:
        try:
            # Primeiro, verificar se há peerings com ip_origem_id como string
            result = await db.execute(text("SELECT id, ip_origem_id FROM peerings WHERE ip_origem_id IS NOT NULL;"))
            peerings = result.fetchall()
            
            print(f"Encontrados {len(peerings)} peerings com ip_origem_id definido")
            
            # Mostrar os valores atuais
            for peering in peerings:
                print(f"Peering ID {peering.id}: ip_origem_id = '{peering.ip_origem_id}'")
            
            # Converter string para integer onde possível
            # Primeiro, vamos mapear os nomes para IDs
            # Buscar dados do roteador para mapear
            router_result = await db.execute(text("SELECT id, ip_origens FROM routers WHERE id = 7;"))
            router_data = router_result.fetchone()
            
            if router_data and router_data.ip_origens:
                ip_origens = router_data.ip_origens
                print("IPs de origem disponíveis:", ip_origens)
                
                # Mapear nomes para IDs
                name_to_id = {}
                for ip_origem in ip_origens:
                    name_to_id[ip_origem['name']] = ip_origem['id']
                
                print("Mapeamento nome -> ID:", name_to_id)
                
                # Atualizar cada peering
                for peering in peerings:
                    old_value = peering.ip_origem_id
                    if old_value in name_to_id:
                        new_id = name_to_id[old_value]
                        print(f"Atualizando peering {peering.id}: '{old_value}' -> {new_id}")
                        await db.execute(text(
                            "UPDATE peerings SET ip_origem_id = :new_id WHERE id = :peering_id"
                        ), {"new_id": str(new_id), "peering_id": peering.id})
                    else:
                        print(f"AVISO: Peering {peering.id} tem ip_origem_id '{old_value}' que não foi encontrado nos IPs de origem")
                
                # Commit das mudanças
                await db.commit()
                print("Dados atualizados com sucesso")
                
                # Agora alterar o tipo da coluna
                print("Alterando tipo da coluna ip_origem_id para INTEGER...")
                await db.execute(text("ALTER TABLE peerings ALTER COLUMN ip_origem_id TYPE INTEGER USING ip_origem_id::INTEGER;"))
                await db.commit()
                print("Tipo da coluna alterado com sucesso")
            
            else:
                print("Erro: Roteador não encontrado ou sem ip_origens")
                
        except Exception as e:
            print(f"Erro durante a migração: {e}")
            await db.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(main())
