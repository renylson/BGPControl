from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.peering import Peering
from app.models.peering_group import PeeringGroup
from app.models.router import Router
from app.schemas.peering import PeeringCreate, PeeringRead, PeeringUpdate
from app.core.config import SessionLocal
from typing import List
import paramiko
import traceback

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.post("/", response_model=PeeringRead)
async def create_peering(peering: PeeringCreate, db: AsyncSession = Depends(get_db)):
    db_peering = Peering(**peering.dict(), is_active=True)
    db.add(db_peering)
    await db.commit()
    await db.refresh(db_peering)
    return db_peering

@router.get("/", response_model=List[PeeringRead])
async def list_peerings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Peering))
    return result.scalars().all()

@router.get("/{peering_id}", response_model=PeeringRead)
async def get_peering(peering_id: int, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    return peering

@router.put("/{peering_id}", response_model=PeeringRead)
async def update_peering(peering_id: int, peering_update: PeeringUpdate, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    for field, value in peering_update.dict(exclude_unset=True).items():
        setattr(peering, field, value)
    await db.commit()
    await db.refresh(peering)
    return peering

@router.delete("/{peering_id}")
async def delete_peering(peering_id: int, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    await db.delete(peering)
    await db.commit()
    return {"ok": True}

@router.post("/{peering_id}/disable")
async def disable_peering(peering_id: int, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    peering.is_active = False
    await db.commit()
    return {"ok": True}

@router.post("/{peering_id}/enable")
async def enable_peering(peering_id: int, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    peering.is_active = True
    await db.commit()
    return {"ok": True}

def run_bgp_commands_via_shell(hostname, port, username, password, asn, peer_ips, action):
    """
    Executa comandos BGP em sessão shell interativa (Huawei/H3C).
    action: 'enable' (undo peer ... ignore) ou 'disable' (peer ... ignore)
    """
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    output = ""
    try:
        client.connect(hostname, port=port, username=username, password=password, look_for_keys=False, allow_agent=False, timeout=10)
        shell = client.invoke_shell()
        shell.settimeout(5)
        cmds = [
            "system-view",
            f"bgp {asn}",
        ]
        for ip in peer_ips:
            if action == "enable":
                cmds.append(f"undo peer {ip} ignore")
            else:
                cmds.append(f"peer {ip} ignore")
        cmds.append("commit")
        cmds.append("return")
        for cmd in cmds:
            shell.send(cmd + "\n")
            buff = ""
            # Aguarda prompt de finalização
            while not buff.endswith("> ") and not buff.endswith("# "):
                try:
                    resp = shell.recv(4096).decode("utf-8")
                    buff += resp
                except Exception:
                    break
            output += f"{buff}\n"
        shell.close()
        client.close()
        return output
    except Exception as e:
        client.close()
        raise HTTPException(status_code=500, detail=f"Erro SSH: {str(e)}")

@router.post("/{peering_id}/bgp-enable")
async def bgp_enable(peering_id: int, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    router = await db.get(Router, peering.router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    hostname = router.ip
    port = router.ssh_port
    username = router.ssh_user
    password = router.ssh_password
    asn = router.asn
    peer_ips = [peering.ip]
    try:
        output = run_bgp_commands_via_shell(hostname, port, username, password, asn, peer_ips, action="enable")
        return {"output": output}
    except Exception as e:
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao executar comandos BGP: {e}\n{tb}")

@router.post("/{peering_id}/bgp-disable")
async def bgp_disable(peering_id: int, db: AsyncSession = Depends(get_db)):
    peering = await db.get(Peering, peering_id)
    if not peering:
        raise HTTPException(status_code=404, detail="Peering não encontrado")
    router = await db.get(Router, peering.router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    hostname = router.ip
    port = router.ssh_port
    username = router.ssh_user
    password = router.ssh_password
    asn = router.asn
    peer_ips = [peering.ip]
    try:
        output = run_bgp_commands_via_shell(hostname, port, username, password, asn, peer_ips, action="disable")
        return {"output": output}
    except Exception as e:
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao executar comandos BGP: {e}\n{tb}")

@router.get("/dashboard/summary")
async def dashboard_summary(db=Depends(get_db)):
    # Conta peerings IPv4 e IPv6
    result = await db.execute(select(Peering))
    peerings = result.scalars().all()
    ipv4 = sum(1 for p in peerings if p.type == 'IPv4')
    ipv6 = sum(1 for p in peerings if p.type == 'IPv6')
    total_peerings = len(peerings)
    # Conta grupos de peerings
    result = await db.execute(select(PeeringGroup))
    grupos = result.scalars().all()
    total_grupos = len(grupos)
    # Conta roteadores
    result = await db.execute(select(Router))
    routers = result.scalars().all()
    total_routers = len(routers)
    return {
        "routers": total_routers,
        "peerings_ipv4": ipv4,
        "peerings_ipv6": ipv6,
        "peerings_total": total_peerings,
        "grupos_total": total_grupos
    }
