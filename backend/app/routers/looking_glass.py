from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
import asyncio
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.router import Router
from app.schemas.looking_glass import QueryRequest, QueryResponse, LookingGlassQuery
from app.services.looking_glass import looking_glass_service
from app.core.deps import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/routers")
async def get_routers(db: AsyncSession = Depends(get_db)):
    """Retorna lista de roteadores disponíveis para Looking Glass"""
    return await looking_glass_service.get_available_routers(db)

@router.post("/query", response_model=QueryResponse)
async def execute_query(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    """Executa uma consulta de Looking Glass"""
    try:
        logger.info(f"Recebida requisição Looking Glass: {request.type} para {request.target} no roteador {request.routerId}")
        
        # Executar com timeout para evitar travamentos
        result = await asyncio.wait_for(
            looking_glass_service.execute_query(request, db),
            timeout=5.0  # 5 segundos apenas para iniciar a query, não para executá-la
        )
        
        logger.info(f"Query Looking Glass iniciada com sucesso: {result.id}")
        return result
    except asyncio.TimeoutError:
        error_msg = "Timeout ao iniciar consulta Looking Glass"
        logger.error(error_msg)
        raise HTTPException(status_code=504, detail=error_msg)
    except Exception as e:
        logger.error(f"Erro ao executar query Looking Glass: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/query/{query_id}", response_model=LookingGlassQuery)
async def get_query(query_id: str):
    """Retorna detalhes de uma query específica"""
    try:
        return looking_glass_service.get_query(query_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/stream/{query_id}")
async def stream_query_output(query_id: str):
    """Stream de saída de uma query em tempo real"""
    
    logger.info(f"Iniciando stream para query {query_id}")
    
    async def generate():
        try:
            # Aguardar um pouco para que a query seja criada
            retry_count = 0
            max_retries = 10
            
            while retry_count < max_retries:
                try:
                    query = looking_glass_service.get_query(query_id)
                    break
                except ValueError:
                    # Query ainda não existe, aguardar um pouco
                    await asyncio.sleep(0.1)
                    retry_count += 1
            else:
                yield f"data: Erro: Query {query_id} não encontrada após aguardar\n\n"
                yield "data: [FIM]\n\n"
                return
            
            # Se a query já está completa, enviar resultado imediatamente
            if query.status in ["completed", "error"]:
                logger.info(f"Query {query_id} já completa, enviando resultado imediatamente")
                if query.output:
                    logger.info(f"Enviando output com {len(query.output)} caracteres")
                    # Enviar linha por linha para melhor processamento no frontend
                    for line in query.output.split('\n'):
                        if line.strip():  # Só enviar linhas não vazias
                            yield f"data: {line}\n\n"
                elif query.error:
                    logger.info(f"Enviando erro: {query.error}")
                    yield f"data: Erro: {query.error}\n\n"
                yield "data: [FIM]\n\n"
                return
            
            # Para queries em execução, fazer polling dos resultados
            previous_output = ""
            max_wait_time = 120  # 2 minutos máximo
            wait_time = 0
            
            while query.status in ["pending", "running"] and wait_time < max_wait_time:
                await asyncio.sleep(0.5)  # Polling interval
                wait_time += 0.5
                
                try:
                    current_query = looking_glass_service.get_query(query_id)
                    
                    if current_query.output and current_query.output != previous_output:
                        # Enviar apenas a diferença
                        new_content = current_query.output[len(previous_output):]
                        for line in new_content.split('\n'):
                            if line.strip():
                                yield f"data: {line}\n\n"
                        previous_output = current_query.output
                    
                    query = current_query
                except ValueError:
                    # Query pode ter sido removida
                    break
            
            # Verificar se houve timeout
            if wait_time >= max_wait_time and query.status in ["pending", "running"]:
                yield f"data: Timeout aguardando resultado da consulta\n\n"
                yield "data: [FIM]\n\n"
                return
            
            # Query finalizada
            if query.status == "completed" and query.output:
                final_content = query.output[len(previous_output):]
                if final_content:
                    for line in final_content.split('\n'):
                        if line.strip():
                            yield f"data: {line}\n\n"
            elif query.status == "error":
                yield f"data: Erro: {query.error}\n\n"
            
            yield "data: [FIM]\n\n"
            
        except Exception as e:
            logger.error(f"Erro no stream da query {query_id}: {e}")
            yield f"data: Erro interno: {str(e)}\n\n"
            yield "data: [FIM]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@router.post("/test-connection/{router_id}")
async def test_router_connection(router_id: int, db: AsyncSession = Depends(get_db)):
    """Testa a conectividade SSH com o roteador"""
    try:
        # Buscar roteador no banco de dados
        result = await db.execute(select(Router).filter(Router.id == router_id))
        router = result.scalar_one_or_none()
        
        if not router:
            raise HTTPException(status_code=404, detail="Roteador não encontrado")
        
        logger.info(f"Testando conectividade SSH com roteador {router.name} ({router.ip}:{router.ssh_port})")
        
        import paramiko
        import base64
        import time
        
        start_time = time.time()
        
        # Decodificar senha
        password = base64.b64decode(router.ssh_password.encode()).decode()
        
        # Conectar via SSH com timeout menor para teste
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            client.connect(
                hostname=router.ip,
                port=router.ssh_port,
                username=router.ssh_user,
                password=password,
                timeout=5  # Timeout menor para teste rápido
            )
            
            connection_time = time.time() - start_time
            
            # Testar comando simples
            command_start = time.time()
            stdin, stdout, stderr = client.exec_command("echo 'Teste de conectividade'", timeout=10)
            output = stdout.read().decode('utf-8', errors='ignore')
            error = stderr.read().decode('utf-8', errors='ignore')
            command_time = time.time() - command_start
            
            client.close()
            
            result_data = {
                "status": "success",
                "router_name": router.name,
                "router_ip": router.ip,
                "connection_time_ms": round(connection_time * 1000, 2),
                "command_time_ms": round(command_time * 1000, 2),
                "test_command_output": output.strip(),
                "test_command_error": error.strip() if error else None,
                "message": f"Conectividade SSH OK - Conexão: {connection_time:.2f}s, Comando: {command_time:.2f}s"
            }
            
            logger.info(f"Teste de conectividade SSH bem-sucedido: {result_data['message']}")
            return result_data
            
        except paramiko.AuthenticationException as e:
            error_msg = f"Erro de autenticação SSH: {str(e)}"
            logger.error(error_msg)
            return {
                "status": "error",
                "router_name": router.name,
                "router_ip": router.ip,
                "error_type": "authentication",
                "error": error_msg
            }
        except paramiko.SSHException as e:
            error_msg = f"Erro de conexão SSH: {str(e)}"
            logger.error(error_msg)
            return {
                "status": "error",
                "router_name": router.name,
                "router_ip": router.ip,
                "error_type": "ssh_connection",
                "error": error_msg
            }
        except Exception as e:
            error_msg = f"Erro na conexão: {str(e)}"
            logger.error(error_msg)
            return {
                "status": "error",
                "router_name": router.name,
                "router_ip": router.ip,
                "error_type": "general",
                "error": error_msg
            }
        finally:
            try:
                client.close()
            except:
                pass
                
    except Exception as e:
        logger.error(f"Erro ao testar conectividade: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao testar conectividade: {str(e)}")

@router.post("/debug-ping")
async def debug_ping_execution(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    """Debug detalhado da execução de ping para identificar problemas"""
    try:
        debug_info = {
            "steps": [],
            "timestamp": datetime.now().isoformat(),
            "request": request.dict()
        }
        
        # Passo 1: Verificar roteador
        debug_info["steps"].append({"step": 1, "action": "Buscando roteador no banco", "timestamp": datetime.now().isoformat()})
        
        result = await db.execute(select(Router).filter(Router.id == request.routerId))
        router = result.scalar_one_or_none()
        
        if not router:
            debug_info["steps"].append({"step": 1, "status": "error", "message": "Roteador não encontrado"})
            return debug_info
        
        debug_info["steps"].append({
            "step": 1, 
            "status": "success", 
            "router_name": router.name,
            "router_ip": router.ip,
            "router_port": router.ssh_port
        })
        
        # Passo 2: Verificar IP de origem
        debug_info["steps"].append({"step": 2, "action": "Verificando IP de origem", "timestamp": datetime.now().isoformat()})
        
        source_ip = None
        source_ip_identifier = request.options.get("sourceIp")
        
        if not source_ip_identifier:
            debug_info["steps"].append({"step": 2, "status": "error", "message": "IP de origem não fornecido"})
            return debug_info
        
        if router.ip_origens:
            for ip_origem in router.ip_origens:
                if str(ip_origem.get("id")) == str(source_ip_identifier):
                    source_ip = ip_origem.get("ip")
                    break
        
        if not source_ip:
            debug_info["steps"].append({
                "step": 2, 
                "status": "error", 
                "message": f"IP de origem com ID {source_ip_identifier} não encontrado",
                "available_ips": router.ip_origens
            })
            return debug_info
        
        debug_info["steps"].append({
            "step": 2, 
            "status": "success", 
            "source_ip": source_ip,
            "source_ip_id": source_ip_identifier
        })
        
        # Passo 3: Teste de conectividade SSH
        debug_info["steps"].append({"step": 3, "action": "Testando conectividade SSH", "timestamp": datetime.now().isoformat()})
        
        import paramiko
        import base64
        import time
        
        try:
            password = base64.b64decode(router.ssh_password.encode()).decode()
            
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            connect_start = time.time()
            client.connect(
                hostname=router.ip,
                port=router.ssh_port,
                username=router.ssh_user,
                password=password,
                timeout=10
            )
            connect_time = time.time() - connect_start
            
            debug_info["steps"].append({
                "step": 3, 
                "status": "success", 
                "connection_time_ms": round(connect_time * 1000, 2)
            })
            
            # Passo 4: Teste do comando ping
            debug_info["steps"].append({"step": 4, "action": "Executando comando ping", "timestamp": datetime.now().isoformat()})
            
            is_ipv6 = ":" in request.target
            if is_ipv6:
                command = f"ping ipv6 -c 30 -m 1 -a {source_ip} {request.target}"
            else:
                command = f"ping -c 30 -m 1 -a {source_ip} {request.target}"
            
            debug_info["steps"].append({
                "step": 4, 
                "command": command,
                "is_ipv6": is_ipv6,
                "timestamp": datetime.now().isoformat()
            })
            
            command_start = time.time()
            stdin, stdout, stderr = client.exec_command(command, timeout=60)
            
            # Ler output progressivamente para debug
            output_lines = []
            error_lines = []
            
            # Ler com timeout para evitar travamento
            output = stdout.read().decode('utf-8', errors='ignore')
            error = stderr.read().decode('utf-8', errors='ignore')
            
            command_time = time.time() - command_start
            
            client.close()
            
            debug_info["steps"].append({
                "step": 4, 
                "status": "completed",
                "command_time_ms": round(command_time * 1000, 2),
                "output_length": len(output),
                "error_length": len(error),
                "has_output": bool(output.strip()),
                "has_error": bool(error.strip())
            })
            
            if error:
                debug_info["ping_error"] = error[:500]  # Primeiros 500 chars do erro
            
            if output:
                debug_info["ping_output"] = output[:1000]  # Primeiros 1000 chars do output
                
            return debug_info
            
        except Exception as ssh_error:
            debug_info["steps"].append({
                "step": 3, 
                "status": "error", 
                "error": str(ssh_error),
                "error_type": type(ssh_error).__name__
            })
            return debug_info
            
    except Exception as e:
        logger.error(f"Erro no debug ping: {e}")
        debug_info["fatal_error"] = str(e)
        return debug_info
