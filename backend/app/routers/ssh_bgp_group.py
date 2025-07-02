from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.peering_group import PeeringGroup, peering_group_association
from app.models.peering import Peering
from app.models.router import Router
from app.core.config import SessionLocal
from app.services.ssh import run_ssh_command
from app.core.deps import is_operator_or_admin

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.post("/peering-groups/{group_id}/bgp-enable", dependencies=[Depends(is_operator_or_admin)])
async def enable_bgp_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(PeeringGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    peerings = (await db.execute(select(Peering).where(Peering.id.in_([p.id for p in group.peerings])))).scalars().all()
    results = []
    for peering in peerings:
        router = await db.get(Router, peering.router_id)
        if not router:
            results.append({"peering_id": peering.id, "error": "Roteador não encontrado"})
            continue
        command = f"configure terminal\nrouter bgp {router.asn}\nno neighbor {peering.ip} shutdown\nend\nwrite memory"
        try:
            output = run_ssh_command(router, command)
            results.append({"peering_id": peering.id, "output": output})
        except Exception as e:
            results.append({"peering_id": peering.id, "error": str(e)})
    return {"results": results}

@router.post("/peering-groups/{group_id}/bgp-disable", dependencies=[Depends(is_operator_or_admin)])
async def disable_bgp_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(PeeringGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    peerings = (await db.execute(select(Peering).where(Peering.id.in_([p.id for p in group.peerings])))).scalars().all()
    results = []
    for peering in peerings:
        router = await db.get(Router, peering.router_id)
        if not router:
            results.append({"peering_id": peering.id, "error": "Roteador não encontrado"})
            continue
        command = f"configure terminal\nrouter bgp {router.asn}\nneighbor {peering.ip} shutdown\nend\nwrite memory"
        try:
            output = run_ssh_command(router, command)
            results.append({"peering_id": peering.id, "output": output})
        except Exception as e:
            results.append({"peering_id": peering.id, "error": str(e)})
    return {"results": results}
