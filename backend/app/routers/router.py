from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.router import Router
from app.schemas.router import RouterCreate, RouterRead
from app.core.config import SessionLocal
from typing import List
import paramiko
import traceback
import logging

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

# --- ENDPOINT DE PREFIXOS ANUNCIADOS ---
@router.get("/{router_id}/bgp-advertised-prefixes")
async def get_bgp_advertised_prefixes(router_id: int, peer_ip: str = Query(...), version: int = Query(4), db: AsyncSession = Depends(get_db)):
    """
    Executa o comando para obter os prefixos anunciados para o peer informado.
    version: 4 (IPv4) ou 6 (IPv6)
    """
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            hostname=router.ip,
            port=router.ssh_port,
            username=router.ssh_user,
            password=router.ssh_password,
            look_for_keys=False,
            allow_agent=False,
            timeout=10
        )
        if version == 6:
            comando = f"display bgp ipv6 routing-table peer {peer_ip} advertised-routes | no-more"
        else:
            comando = f"display bgp routing-table peer {peer_ip} advertised-routes | no-more"
        stdin, stdout, stderr = ssh.exec_command(comando, timeout=30)
        saida = stdout.read().decode(errors="ignore")
        err = stderr.read().decode(errors="ignore")
        ssh.close()
        logging.info(f"BGP ADVERTISED PREFIXES: {comando}\nOutput: {saida}\nError: {err}")
        if not saida.strip():
            raise HTTPException(status_code=404, detail="Nenhum prefixo anunciado encontrado ou sem resposta do roteador.")
        return {"output": saida}
    except Exception as e:
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao executar comando SSH: {e}\n{tb}")


@router.post("/", response_model=RouterRead)
async def create_router(router: RouterCreate, db: AsyncSession = Depends(get_db)):
    db_router = Router(
        name=router.name,
        ip=router.ip,
        ssh_port=router.ssh_port,
        ssh_user=router.ssh_user,
        ssh_password=router.ssh_password,  # Salva em texto puro
        asn=router.asn,
        note=router.note,
        is_active=True,
        ip_origens=router.ip_origens or []
    )
    db.add(db_router)
    await db.commit()
    await db.refresh(db_router)
    return db_router

@router.get("/", response_model=List[RouterRead])
async def list_routers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Router))
    return result.scalars().all()

@router.get("/{router_id}", response_model=RouterRead)
async def get_router(router_id: int, db: AsyncSession = Depends(get_db)):
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    return router

## Removido update_router pois RouterUpdate não existe

@router.delete("/{router_id}")
async def delete_router(router_id: int, db: AsyncSession = Depends(get_db)):
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    await db.delete(router)
    await db.commit()
    return {"ok": True}

@router.post("/{router_id}/disable")
async def disable_router(router_id: int, db: AsyncSession = Depends(get_db)):
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    router.is_active = False
    await db.commit()
    return {"ok": True}

@router.post("/{router_id}/enable")
async def enable_router(router_id: int, db: AsyncSession = Depends(get_db)):
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    router.is_active = True
    await db.commit()
    return {"ok": True}

@router.post("/test-connection")
async def test_connection(
    data: dict = Body(...)
):
    paramiko.util.log_to_file('/tmp/paramiko.log', level=logging.DEBUG)
    ip = data.get("ip")
    ssh_port = data.get("ssh_port")
    ssh_user = data.get("ssh_user")
    ssh_password = data.get("ssh_password")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            ssh.connect(
                hostname=ip,
                port=int(ssh_port),
                username=ssh_user,
                password=ssh_password,
                look_for_keys=False,
                allow_agent=False,
                timeout=5,
                auth_timeout=5,
                banner_timeout=5,
                passphrase=None
            )
        except paramiko.ssh_exception.AuthenticationException as e:
            return {
                "ok": False,
                "message": "Falha de autenticação SSH: usuário ou senha incorretos.",
                "output": "",
                "error": str(e)
            }
        except paramiko.ssh_exception.SSHException as e:
            # Tenta keyboard-interactive se password falhar
            transport = ssh.get_transport()
            if transport is not None and not transport.is_authenticated():
                def handler(title, instructions, prompt_list):
                    return [ssh_password for _ in prompt_list]
                try:
                    transport.auth_interactive(ssh_user, handler)
                except Exception as e2:
                    return {
                        "ok": False,
                        "message": f"Password e keyboard-interactive falharam: {e2}",
                        "output": "",
                        "error": str(e2)
                    }
                if not transport.is_authenticated():
                    return {
                        "ok": False,
                        "message": "Falha de autenticação SSH (keyboard-interactive). Usuário ou senha incorretos.",
                        "output": "",
                        "error": "keyboard-interactive failed"
                    }
            else:
                return {
                    "ok": False,
                    "message": f"Erro SSH: {e}",
                    "output": "",
                    "error": str(e)
                }
        # Confirma autenticação
        transport = ssh.get_transport()
        log_msg = f"is_authenticated={transport.is_authenticated() if transport else None}"
        try:
            # Executa display version | no-more
            stdin, stdout, stderr = ssh.exec_command("display version | no-more", timeout=15)
            saida = stdout.read().decode(errors="ignore")
            err = stderr.read().decode(errors="ignore")
            ssh.close()
            logging.warning(f"Teste SSH: {log_msg} | display version | no-more\nOutput: {saida}\nError: {err}")
            return {
                "ok": True,
                "message": "Autenticação SSH bem-sucedida! Comando 'display version | no-more' executado.",
                "output": saida,
                "error": err
            }
        except Exception as e:
            ssh.close()
            logging.warning(f"Teste SSH: {log_msg} | Falha ao executar comando: {e}")
            return {
                "ok": False,
                "message": "Falha após autenticação SSH ao executar 'display version | no-more'.",
                "output": log_msg,
                "error": str(e)
            }
    except Exception as e:
        tb = traceback.format_exc()
        return {
            "ok": False,
            "message": f"Erro inesperado: {e}",
            "output": "",
            "error": tb
        }

@router.get("/{router_id}/bgp-status")
async def get_bgp_status(router_id: int, peer_ip: str = Query(...), db: AsyncSession = Depends(get_db)):
    """
    Executa o comando BGP no roteador via SSH e retorna o output bruto.
    Para grupo de peerings, envie peer_ip separado por '|'.
    """
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            hostname=router.ip,
            port=router.ssh_port,
            username=router.ssh_user,
            password=router.ssh_password,
            look_for_keys=False,
            allow_agent=False,
            timeout=10
        )
        # Permite múltiplos IPs separados por |
        comando = f"display bgp all summary | inc {peer_ip}"
        stdin, stdout, stderr = ssh.exec_command(comando, timeout=20)
        saida = stdout.read().decode(errors="ignore")
        err = stderr.read().decode(errors="ignore")
        ssh.close()
        logging.info(f"BGP STATUS: {comando}\nOutput: {saida}\nError: {err}")
        if not saida.strip():
            raise HTTPException(status_code=404, detail="Peer(s) não encontrado(s) ou sem resposta do roteador.")
        return {"output": saida}
    except Exception as e:
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao executar comando SSH: {e}\n{tb}")
