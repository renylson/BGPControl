from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.peering import Peering
from app.models.router import Router
from app.core.config import SessionLocal
from app.services.ssh import run_ssh_command

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.get("/peerings/{peering_id}/bgp-status")
async def get_bgp_status(peering_id: int, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    router = await db.get(Router, peering.router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    # Exemplo de comando para Cisco IOS, ajuste conforme necessário
    command = f"show bgp neighbor {peering.ip} summary"
    try:
        output = run_ssh_command(router, command)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro SSH: {e}")
    return {"output": output}
