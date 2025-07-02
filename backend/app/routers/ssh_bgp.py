from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.peering import Peering
from app.models.router import Router
from app.core.config import SessionLocal
from app.services.ssh import run_ssh_command
from app.core.deps import is_operator_or_admin

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.post("/peerings/{peering_id}/bgp-enable", dependencies=[Depends(is_operator_or_admin)])
async def enable_bgp_peering(peering_id: int, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    router = await db.get(Router, peering.router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    # Exemplo Cisco IOS: no neighbor <ip> shutdown
    command = f"configure terminal\nrouter bgp {router.asn}\nno neighbor {peering.ip} shutdown\nend\nwrite memory"
    try:
        output = run_ssh_command(router, command)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro SSH: {e}")
    return {"output": output}

@router.post("/peerings/{peering_id}/bgp-disable", dependencies=[Depends(is_operator_or_admin)])
async def disable_bgp_peering(peering_id: int, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    router = await db.get(Router, peering.router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    # Exemplo Cisco IOS: neighbor <ip> shutdown
    command = f"configure terminal\nrouter bgp {router.asn}\nneighbor {peering.ip} shutdown\nend\nwrite memory"
    try:
        output = run_ssh_command(router, command)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro SSH: {e}")
    return {"output": output}
