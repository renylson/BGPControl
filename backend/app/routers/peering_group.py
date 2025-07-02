from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.peering_group import PeeringGroup, peering_group_association
from app.models.peering import Peering
from app.schemas.peering_group import PeeringGroupCreate, PeeringGroupRead, PeeringGroupUpdate
from app.core.config import SessionLocal
from typing import List
from app.models.router import Router
import paramiko
import traceback

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.post("/", response_model=PeeringGroupRead)
async def create_group(group: PeeringGroupCreate, db: AsyncSession = Depends(get_db)):
    # Filtra peerings do roteador selecionado
    peerings = (await db.execute(select(Peering).where(Peering.id.in_(group.peering_ids), Peering.router_id == group.router_id))).scalars().all()
    if len(peerings) != len(group.peering_ids):
        raise HTTPException(status_code=400, detail="Todos os peerings devem pertencer ao roteador selecionado.")
    db_group = PeeringGroup(
        name=group.name,
        description=group.description,
        router_id=group.router_id,
        is_active=True,
        peerings=peerings
    )
    db.add(db_group)
    await db.commit()
    # Buscar o grupo já com peerings após commit para evitar lazy loading
    result = await db.execute(select(PeeringGroup).where(PeeringGroup.id == db_group.id))
    db_group = result.scalars().first()
    return PeeringGroupRead(
        id=db_group.id,
        name=db_group.name,
        description=db_group.description,
        router_id=db_group.router_id,
        is_active=db_group.is_active,
        peering_ids=[p.id for p in db_group.peerings]
    )

@router.get("/", response_model=List[PeeringGroupRead])
async def list_groups(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PeeringGroup))
    groups = result.scalars().all()
    group_reads = []
    for g in groups:
        # Buscar explicitamente os peerings do grupo
        peerings_result = await db.execute(
            select(peering_group_association.c.peering_id).where(peering_group_association.c.group_id == g.id)
        )
        peering_ids = [row[0] for row in peerings_result.fetchall()]
        group_reads.append(PeeringGroupRead(
            id=g.id,
            name=g.name,
            description=g.description,
            router_id=g.router_id,
            is_active=g.is_active,
            peering_ids=peering_ids
        ))
    return group_reads

@router.get("/{group_id}", response_model=PeeringGroupRead)
async def get_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(PeeringGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    # Buscar explicitamente os peerings do grupo para evitar erro async
    result = await db.execute(
        select(peering_group_association.c.peering_id).where(peering_group_association.c.group_id == group.id)
    )
    peering_ids = [row[0] for row in result.fetchall()]
    return PeeringGroupRead(
        id=group.id,
        name=group.name,
        description=group.description,
        router_id=group.router_id,
        is_active=group.is_active,
        peering_ids=peering_ids
    )

@router.put("/{group_id}", response_model=PeeringGroupRead)
async def update_group(group_id: int, group_update: PeeringGroupUpdate, db: AsyncSession = Depends(get_db)):
    group = await db.get(PeeringGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    if group_update.name is not None:
        group.name = group_update.name
    if group_update.description is not None:
        group.description = group_update.description
    if group_update.is_active is not None:
        group.is_active = group_update.is_active
    if group_update.peering_ids is not None:
        peerings = (await db.execute(select(Peering).where(Peering.id.in_(group_update.peering_ids), Peering.router_id == group.router_id))).scalars().all()
        if len(peerings) != len(group_update.peering_ids):
            raise HTTPException(status_code=400, detail="Todos os peerings devem pertencer ao roteador do grupo.")
        group.peerings = peerings
    await db.commit()
    # Buscar o grupo já com peerings após commit para evitar lazy loading
    result = await db.execute(select(PeeringGroup).where(PeeringGroup.id == group.id))
    group = result.scalars().first()
    # Buscar explicitamente os peerings do grupo
    peerings_result = await db.execute(
        select(peering_group_association.c.peering_id).where(peering_group_association.c.group_id == group.id)
    )
    peering_ids = [row[0] for row in peerings_result.fetchall()]
    return PeeringGroupRead(
        id=group.id,
        name=group.name,
        description=group.description,
        router_id=group.router_id,
        is_active=group.is_active,
        peering_ids=peering_ids
    )

@router.delete("/{group_id}")
async def delete_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(PeeringGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    await db.delete(group)
    await db.commit()
    return {"ok": True}

@router.post("/{group_id}/disable")
async def disable_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(PeeringGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    group.is_active = False
    await db.commit()
    return {"ok": True}

@router.post("/{group_id}/enable")
async def enable_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(PeeringGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    group.is_active = True
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
        try:
            client.close()
        except Exception:
            pass
        # Não lança HTTPException, retorna erro como string
        return f"Erro SSH: {str(e)}"

@router.post("/{group_id}/bgp-enable")
async def bgp_enable_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(PeeringGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    router = await db.get(Router, group.router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    # Busca todos os peerings ativos do grupo
    peerings = (await db.execute(select(Peering).join(peering_group_association, Peering.id == peering_group_association.c.peering_id).where(peering_group_association.c.group_id == group_id))).scalars().all()
    peer_ips = [p.ip for p in peerings]
    if not peer_ips:
        raise HTTPException(status_code=404, detail="Nenhum peering encontrado no grupo.")
    hostname = router.ip
    port = router.ssh_port
    username = router.ssh_user
    password = router.ssh_password
    asn = router.asn
    try:
        output = run_bgp_commands_via_shell(hostname, port, username, password, asn, peer_ips, action="enable")
        return {"output": output}
    except HTTPException as e:
        # Se for HTTPException, repasse para o FastAPI
        raise e
    except Exception as e:
        tb = traceback.format_exc()
        # Retorne o output parcial, se existir, mesmo em caso de erro
        return {"output": str(e) + "\n" + tb, "error": True}

@router.post("/{group_id}/bgp-disable")
async def bgp_disable_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(PeeringGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    router = await db.get(Router, group.router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    peerings = (await db.execute(select(Peering).join(peering_group_association, Peering.id == peering_group_association.c.peering_id).where(peering_group_association.c.group_id == group_id))).scalars().all()
    peer_ips = [p.ip for p in peerings]
    if not peer_ips:
        raise HTTPException(status_code=404, detail="Nenhum peering encontrado no grupo.")
    hostname = router.ip
    port = router.ssh_port
    username = router.ssh_user
    password = router.ssh_password
    asn = router.asn
    try:
        output = run_bgp_commands_via_shell(hostname, port, username, password, asn, peer_ips, action="disable")
        return {"output": output}
    except HTTPException as e:
        raise e
    except Exception as e:
        tb = traceback.format_exc()
        return {"output": str(e) + "\n" + tb, "error": True}
