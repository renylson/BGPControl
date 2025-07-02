from fastapi import APIRouter, Depends, HTTPException, Request, Query
from jose import jwt, JWTError
from app.core.config import SECRET_KEY, ALGORITHM
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.peering_group import PeeringGroup, peering_group_association
from app.models.peering import Peering
from app.core.config import SessionLocal
from app.models.router import Router
import paramiko
import asyncio

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

def run_bgp_commands_stream(hostname, port, username, password, asn, peer_ips, action, yield_func):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
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
            yield_func(f"$ {cmd}")
            buff = ""
            while True:
                try:
                    resp = shell.recv(4096).decode("utf-8")
                    if not resp:
                        break
                    buff += resp
                    for line in resp.splitlines():
                        yield_func(line)
                    if buff.strip().endswith(">") or buff.strip().endswith("#"):
                        break
                except Exception:
                    break
            asyncio.sleep(0.2)
        shell.close()
        client.close()
    except Exception as e:
        try:
            client.close()
        except Exception:
            pass
        yield_func(f"Erro SSH: {str(e)}")

@router.get("/{group_id}/bgp-{action}-stream")
async def bgp_group_stream(group_id: int, action: str, request: Request, token: str = Query(...), db: AsyncSession = Depends(get_db)):
    # Validação manual do JWT
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    if action not in ("enable", "disable"):
        raise HTTPException(status_code=400, detail="Ação inválida")
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
    async def event_generator():
        queue = asyncio.Queue()
        def yield_func(line):
            queue.put_nowait(line)
        try:
            yield "data: Iniciando execução...\n\n"
            run_bgp_commands_stream(hostname, port, username, password, asn, peer_ips, action, yield_func)
            while not queue.empty():
                line = await queue.get()
                yield f"data: {line}\n\n"
                if await request.is_disconnected():
                    break
        except Exception as e:
            yield f"data: Erro no streaming: {str(e)}\n\n"
        finally:
            yield "data: [FIM]\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")
