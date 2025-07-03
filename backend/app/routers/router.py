from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.router import Router
from app.schemas.router import RouterCreate, RouterRead, RouterUpdate
from app.core.config import SessionLocal
from app.core.deps import get_current_user, is_operator_or_admin
from app.models.user import User
from typing import List
import paramiko
import traceback
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.get("/{router_id}/bgp-advertised-prefixes")
async def get_bgp_advertised_prefixes(router_id: int, peer_ip: str = Query(...), version: int = Query(4), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Executa o comando para obter os prefixos anunciados para o peer informado.
    version: 4 (IPv4) ou 6 (IPv6)
    """
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    try:
        import base64
        
        # Decodificar senha
        try:
            password = base64.b64decode(router.ssh_password.encode()).decode()
        except:
            # Se falhar na decodificação, usar a senha como está (caso não esteja codificada)
            password = router.ssh_password
        
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            hostname=router.ip,
            port=router.ssh_port,
            username=router.ssh_user,
            password=password,
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
async def create_router(router: RouterCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(is_operator_or_admin)):
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
async def list_routers(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Router))
    return result.scalars().all()

@router.get("/{router_id}", response_model=RouterRead)
async def get_router(router_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    return router

@router.put("/{router_id}", response_model=RouterRead)
async def update_router(router_id: int, router_update: RouterUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(is_operator_or_admin)):
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    
    update_data = router_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == "ssh_password":
            if value and value.strip():  # Se a senha foi fornecida e não está vazia
                # Criptografar nova senha
                import base64
                value = base64.b64encode(value.encode()).decode()
                setattr(router, field, value)
                logger.info(f"Senha do roteador {router_id} foi atualizada")
            else:
                # Se a senha está vazia, não alterar a senha atual
                logger.info(f"Senha do roteador {router_id} mantida (campo vazio)")
                continue
        else:
            setattr(router, field, value)
    
    await db.commit()
    await db.refresh(router)
    return router

## Removido update_router pois RouterUpdate não existe

@router.delete("/{router_id}")
async def delete_router(router_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(is_operator_or_admin)):
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
    
    # Não precisa decodificar aqui pois a senha vem direto do formulário
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
        import base64
        
        # Decodificar senha
        try:
            password = base64.b64decode(router.ssh_password.encode()).decode()
        except:
            # Se falhar na decodificação, usar a senha como está (caso não esteja codificada)
            password = router.ssh_password
        
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            hostname=router.ip,
            port=router.ssh_port,
            username=router.ssh_user,
            password=password,
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

@router.get("/{router_id}/ping")
async def ping_from_router(
    router_id: int, 
    source_ip_id: int, 
    target_ip: str, 
    is_ipv6: bool = Query(False),
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    logger.info(f"Ping request: router_id={router_id}, source_ip_id={source_ip_id}, target_ip={target_ip}, is_ipv6={is_ipv6}")
    
    router_obj = await db.get(Router, router_id)
    if not router_obj:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    
    # Buscar o IP de origem pelo ID
    source_ip = None
    if router_obj.ip_origens:
        logger.info(f"IPs de origem disponíveis: {router_obj.ip_origens}")
        for ip_origem in router_obj.ip_origens:
            if ip_origem.get("id") == source_ip_id:
                source_ip = ip_origem.get("ip")
                logger.info(f"IP de origem encontrado: {source_ip}")
                break
    else:
        logger.warning(f"Roteador {router_id} não possui IPs de origem configurados")
    
    if not source_ip:
        available_ips = []
        if router_obj.ip_origens:
            available_ips = [f"ID: {ip.get('id')} - IP: {ip.get('ip')}" for ip in router_obj.ip_origens]
        error_msg = f"IP de origem com ID {source_ip_id} não encontrado neste roteador. IPs disponíveis: {', '.join(available_ips) if available_ips else 'Nenhum'}"
        logger.error(error_msg)
        raise HTTPException(status_code=404, detail=error_msg)
    
    try:
        import paramiko
        import base64
        
        # Decodificar senha
        try:
            password = base64.b64decode(router_obj.ssh_password.encode()).decode()
        except:
            # Se falhar na decodificação, usar a senha como está (caso não esteja codificada)
            password = router_obj.ssh_password
        
        logger.info(f"Conectando via SSH ao roteador {router_obj.ip}:{router_obj.ssh_port}")
        
        # Conectar via SSH
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=router_obj.ip,
            port=router_obj.ssh_port,
            username=router_obj.ssh_user,
            password=password,
            timeout=10
        )
        
        # Comando ping com os parâmetros fixos:
        # Para IPv4: ping -c 30 -m 1 -a <ip_de_origem> <ip_de_peering>
        # Para IPv6: ping ipv6 -c 30 -a <IPv6_origem> <IPv6_Perring>
        if is_ipv6:
            command = f"ping ipv6 -c 30 -m 1 -a {source_ip} {target_ip}"
        else:
            command = f"ping -c 30 -m 1 -a {source_ip} {target_ip}"
        
        logger.info(f"Executando comando: {command}")
        
        # Executar comando diretamente
        stdin, stdout, stderr = client.exec_command(command, timeout=90)
        
        # Configurar timeout nos canais para evitar travamento
        stdout.channel.settimeout(90.0)
        stderr.channel.settimeout(90.0)
        
        output = stdout.read().decode('utf-8', errors='ignore')
        error = stderr.read().decode('utf-8', errors='ignore')
        
        # Aguardar o comando terminar para evitar problemas de conexão
        exit_status = stdout.channel.recv_exit_status()
        
        client.close()
        
        # Incluir erro na saída se houver
        if error:
            logger.warning(f"Stderr do comando ping: {error}")
            output += f"\n{error}"
        
        logger.info(f"Comando ping executado com sucesso (exit: {exit_status})")
        return {"output": output}
        
    except paramiko.ChannelException as e:
        error_msg = f"Erro de canal SSH (roteador pode estar limitando sessões): {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    except paramiko.AuthenticationException as e:
        error_msg = f"Erro de autenticação SSH: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    except paramiko.SSHException as e:
        error_msg = f"Erro de conexão SSH: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        error_msg = f"Erro ao executar ping: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
