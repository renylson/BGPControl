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
import os

logger = logging.getLogger(__name__)
router = APIRouter()

def setup_ssh_client():
    """
    Configura um cliente SSH com políticas adequadas para aceitar chaves de host automaticamente.
    """
    client = paramiko.SSHClient()
    
    # Política para aceitar automaticamente chaves de host desconhecidas
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # Garantir que o diretório SSH existe
    ssh_dir = os.path.expanduser('~/.ssh')
    if not os.path.exists(ssh_dir):
        try:
            os.makedirs(ssh_dir, mode=0o700)
            logger.debug(f"Diretório SSH criado: {ssh_dir}")
        except Exception as e:
            logger.debug(f"Erro ao criar diretório SSH: {e}")
    
    # Tentar carregar chaves de host conhecidas, se existirem
    try:
        client.load_system_host_keys()
        # Carrega do arquivo padrão do usuário SSH
        known_hosts_file = os.path.join(ssh_dir, 'known_hosts')
        if os.path.exists(known_hosts_file):
            client.load_host_keys(known_hosts_file)
        else:
            # Criar arquivo known_hosts vazio se não existir
            try:
                with open(known_hosts_file, 'a'):
                    pass
                os.chmod(known_hosts_file, 0o644)
                logger.debug(f"Arquivo known_hosts criado: {known_hosts_file}")
            except Exception as e:
                logger.debug(f"Erro ao criar known_hosts: {e}")
    except Exception as e:
        # Ignora erros ao carregar chaves de host
        logger.debug(f"Aviso ao carregar chaves de host: {e}")
        pass
    
    return client

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
        
        ssh = setup_ssh_client()
        ssh.connect(
            hostname=router.ip,
            port=router.ssh_port,
            username=router.ssh_user,
            password=password,
            look_for_keys=False,
            allow_agent=False,
            timeout=10,
            gss_auth=False,
            gss_kex=False
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
    routers = result.scalars().all()
    
    # Limpar senhas antes de retornar
    router_list = []
    for router in routers:
        router_dict = {
            "id": router.id,
            "name": router.name,
            "ip": router.ip,
            "ssh_port": router.ssh_port,
            "ssh_user": router.ssh_user,
            "ssh_password": "",  # Sempre vazio para não expor a senha
            "asn": router.asn,
            "note": router.note,
            "is_active": router.is_active,
            "ip_origens": router.ip_origens or []
        }
        router_list.append(RouterRead(**router_dict))
    
    return router_list

@router.get("/{router_id}", response_model=RouterRead)
async def get_router(router_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    
    # Criar uma cópia do router com a senha vazia para não expor a senha criptografada
    router_dict = {
        "id": router.id,
        "name": router.name,
        "ip": router.ip,
        "ssh_port": router.ssh_port,
        "ssh_user": router.ssh_user,
        "ssh_password": "",  # Sempre vazio para não expor a senha
        "asn": router.asn,
        "note": router.note,
        "is_active": router.is_active,
        "ip_origens": router.ip_origens or []
    }
    return RouterRead(**router_dict)

@router.put("/{router_id}", response_model=RouterRead)
async def update_router(router_id: int, router_update: RouterUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(is_operator_or_admin)):
    router = await db.get(Router, router_id)
    if not router:
        raise HTTPException(status_code=404, detail="Roteador não encontrado")
    
    update_data = router_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == "ssh_password":
            # Apenas criptografar se a senha foi fornecida e não está vazia
            if value and value.strip():
                import base64
                # Criptografar nova senha
                encrypted_password = base64.b64encode(value.encode()).decode()
                setattr(router, field, encrypted_password)
                logger.info(f"Senha do roteador {router_id} foi atualizada")
            # Se a senha está vazia ou None, não alterar a senha atual
            # (mantém a senha existente no banco)
        else:
            setattr(router, field, value)
    
    await db.commit()
    await db.refresh(router)
    
    # Retornar o router atualizado sem expor a senha
    router_dict = {
        "id": router.id,
        "name": router.name,
        "ip": router.ip,
        "ssh_port": router.ssh_port,
        "ssh_user": router.ssh_user,
        "ssh_password": "",  # Sempre vazio para não expor a senha
        "asn": router.asn,
        "note": router.note,
        "is_active": router.is_active,
        "ip_origens": router.ip_origens or []
    }
    return RouterRead(**router_dict)

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
    output_buffer = ""  # Buffer para coletar toda a saída durante o teste
    debug_log = []  # Log detalhado de debug
    
    try:
        ssh = setup_ssh_client()
        output_buffer += f"Tentando conectar em {ip}:{ssh_port} com usuário '{ssh_user}'...\n"
        output_buffer += "Política de chave de host: AutoAddPolicy (aceita automaticamente chaves desconhecidas)\n"
        debug_log.append(f"Iniciando conexão SSH para {ip}:{ssh_port}")
        
        try:
            debug_log.append("Chamando ssh.connect()...")
            ssh.connect(
                hostname=ip,
                port=int(ssh_port),
                username=ssh_user,
                password=ssh_password,
                look_for_keys=False,
                allow_agent=False,
                timeout=10,
                auth_timeout=10,
                banner_timeout=10,
                passphrase=None,
                disabled_algorithms={'pubkeys': ['rsa-sha2-256', 'rsa-sha2-512']},  # Pode ajudar com alguns roteadores
                gss_auth=False,
                gss_kex=False,
                gss_deleg_creds=False,
                gss_host=None
            )
            debug_log.append("ssh.connect() completou sem exceção")
            output_buffer += "Conexão SSH estabelecida com sucesso!\n"
            output_buffer += "Chave de host aceita automaticamente (se necessário)\n"
        except paramiko.ssh_exception.AuthenticationException as e:
            debug_log.append(f"AuthenticationException: {str(e)}")
            output_buffer += f"Falha de autenticação: {str(e)}\n"
            return {
                "ok": False,
                "message": "Falha de autenticação SSH: usuário ou senha incorretos.",
                "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                "error": str(e)
            }
        except paramiko.ssh_exception.NoValidConnectionsError as e:
            debug_log.append(f"NoValidConnectionsError: {str(e)}")
            output_buffer += f"Erro de conexão - host/porta inacessível: {str(e)}\n"
            return {
                "ok": False,
                "message": f"Não foi possível conectar ao host {ip}:{ssh_port}. Verifique se o host está acessível.",
                "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                "error": str(e)
            }
        except paramiko.ssh_exception.BadHostKeyException as e:
            debug_log.append(f"BadHostKeyException: {str(e)}")
            output_buffer += f"Problema com chave de host: {str(e)}\n"
            return {
                "ok": False,
                "message": "Problema com a chave de host SSH. Isso pode indicar um possível ataque man-in-the-middle.",
                "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                "error": str(e)
            }
        except paramiko.ssh_exception.SSHException as e:
            debug_log.append(f"SSHException: {str(e)}")
            output_buffer += f"Erro SSH inicial: {str(e)}\n"
            # Tenta keyboard-interactive se password falhar
            transport = ssh.get_transport()
            if transport is not None and not transport.is_authenticated():
                debug_log.append("Tentando autenticação keyboard-interactive...")
                output_buffer += "Tentando autenticação keyboard-interactive...\n"
                def handler(title, instructions, prompt_list):
                    debug_log.append(f"Keyboard-interactive - Title: {title}, Instructions: {instructions}, Prompts: {prompt_list}")
                    return [ssh_password for _ in prompt_list]
                try:
                    transport.auth_interactive(ssh_user, handler)
                    debug_log.append("Autenticação keyboard-interactive bem-sucedida")
                    output_buffer += "Autenticação keyboard-interactive bem-sucedida!\n"
                except Exception as e2:
                    debug_log.append(f"Falha keyboard-interactive: {str(e2)}")
                    output_buffer += f"Falha na autenticação keyboard-interactive: {str(e2)}\n"
                    return {
                        "ok": False,
                        "message": f"Password e keyboard-interactive falharam: {e2}",
                        "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                        "error": str(e2)
                    }
                if not transport.is_authenticated():
                    debug_log.append("Falha na autenticação após keyboard-interactive")
                    output_buffer += "Falha na autenticação após keyboard-interactive\n"
                    return {
                        "ok": False,
                        "message": "Falha de autenticação SSH (keyboard-interactive). Usuário ou senha incorretos.",
                        "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                        "error": "keyboard-interactive failed"
                    }
            else:
                debug_log.append(f"Erro SSH irrecuperável, transport: {transport}")
                output_buffer += f"Erro SSH irrecuperável: {str(e)}\n"
                return {
                    "ok": False,
                    "message": f"Erro SSH: {e}",
                    "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                    "error": str(e)
                }
        
        # Confirma autenticação
        transport = ssh.get_transport()
        is_auth = transport.is_authenticated() if transport else False
        debug_log.append(f"Autenticação confirmada: {is_auth}, transport: {transport is not None}")
        output_buffer += f"Autenticação confirmada: {is_auth}\n"
        
        # Primeiro método: shell interativo (melhor para Huawei)
        debug_log.append("Iniciando método shell interativo...")
        output_buffer += "Método 1: Tentando shell interativo...\n"
        try:
            debug_log.append("Chamando ssh.invoke_shell()...")
            channel = ssh.invoke_shell()
            channel.settimeout(15)
            debug_log.append("Shell interativo criado")
            output_buffer += "Shell interativo criado com sucesso!\n"
            
            # Aguarda um pouco para qualquer prompt inicial aparecer
            import time
            debug_log.append("Aguardando estabilização da conexão...")
            time.sleep(3)
            
            # Lê e descarta qualquer dados iniciais (prompts, avisos, etc.)
            initial_data = ""
            attempts = 0
            while attempts < 10:
                if channel.recv_ready():
                    data = channel.recv(4096).decode(errors="ignore")
                    initial_data += data
                    debug_log.append(f"Dados iniciais descartados ({len(data)} chars)")
                else:
                    time.sleep(0.2)
                attempts += 1
            
            debug_log.append(f"Total de dados iniciais ignorados: {len(initial_data)} caracteres")
            output_buffer += f"Dados iniciais (avisos/prompts) ignorados: {len(initial_data)} caracteres\n"
            
            # Enviar comando diretamente, independente de qualquer prompt
            command = "display version | no-more"
            debug_log.append(f"Enviando comando: {command}")
            output_buffer += f"Enviando comando: {command}\n"
            
            # Enviar Enter algumas vezes para garantir que saia de qualquer diálogo
            channel.send('\n\n')
            time.sleep(0.5)
            
            # Enviar o comando
            channel.send(f"{command}\n")
            time.sleep(4)  # Aguarda a execução
            
            # Lê a saída do comando
            command_output = ""
            max_attempts = 30
            attempts = 0
            debug_log.append("Lendo resposta do comando...")
            
            while attempts < max_attempts:
                if channel.recv_ready():
                    data = channel.recv(4096).decode(errors="ignore")
                    command_output += data
                    debug_log.append(f"Dados do comando recebidos ({len(data)} chars)")
                    if not channel.recv_ready():
                        time.sleep(0.3)
                        if not channel.recv_ready():
                            break
                else:
                    time.sleep(0.2)
                attempts += 1
            
            debug_log.append(f"Total dados do comando: {len(command_output)} caracteres")
            channel.close()
            ssh.close()
            
            # Mostrar dados iniciais + saída do comando
            full_output = f"=== DADOS INICIAIS (IGNORADOS) ===\n{initial_data}\n\n=== SAÍDA DO COMANDO ===\n{command_output}"
            
            output_buffer += f"Saída completa:\n"
            output_buffer += "="*60 + "\n"
            output_buffer += full_output
            output_buffer += "\n" + "="*60 + "\n"
            
            # Se temos alguma saída do comando, consideramos sucesso
            if command_output.strip():
                debug_log.append("Comando executado - temos saída do roteador")
                logging.info(f"Teste SSH bem-sucedido")
                return {
                    "ok": True,
                    "message": "Conexão SSH bem-sucedida! Comando executado.",
                    "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                    "error": ""
                }
            else:
                debug_log.append("Comando enviado mas sem saída clara")
                return {
                    "ok": False,
                    "message": "Conexão estabelecida mas comando não retornou saída",
                    "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                    "error": "No command output"
                }
            debug_log.append("Tentando executar comando de teste...")
            
            # Tentar executar comando de teste
            command = "display version | no-more"
            debug_log.append(f"Enviando comando: {command}")
            output_buffer += f"Enviando comando: {command}\n"
            channel.send(f"{command}\n")
            time.sleep(3)  # Aguarda a execução
            
            # Lê a saída do comando
            command_output = ""
            max_attempts = 30
            attempts = 0
            debug_log.append("Lendo resposta do comando...")
            
            while attempts < max_attempts:
                if channel.recv_ready():
                    data = channel.recv(4096).decode(errors="ignore")
                    command_output += data
                    debug_log.append(f"Dados do comando ({len(data)} chars): {repr(data[:100])}")
                    if not channel.recv_ready():
                        time.sleep(0.2)  # Pequena pausa para garantir que não há mais dados
                        if not channel.recv_ready():
                            break
                else:
                    time.sleep(0.1)
                attempts += 1
            
            debug_log.append(f"Total dados do comando: {len(command_output)} caracteres")
            channel.close()
            ssh.close()
            
            # Combinar saída inicial + comando
            full_output = initial_output + command_output
            
            output_buffer += f"Saída completa do shell ({len(full_output)} caracteres):\n"
            output_buffer += "="*50 + "\n"
            output_buffer += full_output
            output_buffer += "\n" + "="*50 + "\n"
            
            # Limpeza da saída do comando (apenas a parte do comando)
            lines = command_output.split('\n')
            clean_lines = []
            skip_first = True
            for line in lines:
                if skip_first and command in line:
                    skip_first = False
                    continue
                if line.strip() and not line.strip().startswith('[') and not line.strip().endswith(']>'):
                    clean_lines.append(line)
            
            clean_output = '\n'.join(clean_lines).strip()
            
            debug_log.append(f"Comando executado com sucesso, saída limpa: {len(clean_output)} chars")
            logging.info(f"Teste SSH via shell interativo bem-sucedido")
            return {
                "ok": True,
                "message": "Autenticação SSH bem-sucedida! Comando executado via shell interativo.",
                "output": output_buffer + f"\nSaída limpa do comando:\n{clean_output}\n\nDebug Log:\n" + "\n".join(debug_log),
                "error": ""
            }
            
        except Exception as e:
            debug_log.append(f"Falha no shell interativo: {str(e)}")
            output_buffer += f"Shell interativo falhou: {str(e)}\n"
            
            # Fallback simples: tentar exec_command
            debug_log.append("Tentando exec_command como fallback...")
            output_buffer += "Tentando exec_command como alternativa...\n"
            
            try:
                stdin, stdout, stderr = ssh.exec_command("display version | no-more", timeout=15)
                saida = stdout.read().decode(errors="ignore")
                err = stderr.read().decode(errors="ignore")
                ssh.close()
                
                debug_log.append(f"exec_command executado - stdout: {len(saida)} chars")
                
                if saida.strip():
                    output_buffer += f"Saída do exec_command:\n"
                    output_buffer += "="*60 + "\n"
                    output_buffer += saida
                    output_buffer += "\n" + "="*60 + "\n"
                    
                    debug_log.append("exec_command bem-sucedido")
                    return {
                        "ok": True,
                        "message": "Conexão SSH bem-sucedida via exec_command!",
                        "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                        "error": err if err else ""
                    }
                else:
                    debug_log.append("exec_command sem saída")
                    return {
                        "ok": False,
                        "message": "Conexão estabelecida mas nenhum comando funcionou",
                        "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                        "error": "No output from any method"
                    }
                    
            except Exception as e2:
                debug_log.append(f"exec_command também falhou: {str(e2)}")
                ssh.close()
                return {
                    "ok": False,
                    "message": "Ambos métodos SSH falharam após autenticação",
                    "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
                    "error": f"Shell: {str(e)}, Exec: {str(e2)}"
                }
    except Exception as e:
        debug_log.append(f"Erro inesperado no nível superior: {str(e)}")
        output_buffer += f"Erro inesperado: {str(e)}\n"
        tb = traceback.format_exc()
        debug_log.append(f"Traceback: {tb}")
        output_buffer += f"Traceback: {tb}\n"
        return {
            "ok": False,
            "message": f"Erro inesperado: {e}",
            "output": output_buffer + "\n\nDebug Log:\n" + "\n".join(debug_log),
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
        
        ssh = setup_ssh_client()
        ssh.connect(
            hostname=router.ip,
            port=router.ssh_port,
            username=router.ssh_user,
            password=password,
            look_for_keys=False,
            allow_agent=False,
            timeout=10,
            gss_auth=False,
            gss_kex=False
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
        client = setup_ssh_client()
        client.connect(
            hostname=router_obj.ip,
            port=router_obj.ssh_port,
            username=router_obj.ssh_user,
            password=password,
            timeout=10,
            look_for_keys=False,
            allow_agent=False,
            gss_auth=False,
            gss_kex=False
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
