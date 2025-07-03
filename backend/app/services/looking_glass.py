import asyncio
import subprocess
import uuid
import paramiko
import base64
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.schemas.looking_glass import QueryRequest, QueryResponse, LookingGlassQuery, RouterInfo, IpOrigem
from app.models.router import Router
import logging

logger = logging.getLogger(__name__)

class LookingGlassService:
    def __init__(self):
        # Cache para queries ativas
        self.active_queries: Dict[str, LookingGlassQuery] = {}
        # Cache para tasks ativas para evitar garbage collection
        self.active_tasks: Dict[str, asyncio.Task] = {}
    
    async def get_available_routers(self, db: AsyncSession) -> List[RouterInfo]:
        """Retorna lista de roteadores disponíveis para Looking Glass"""
        try:
            # Buscar roteadores do banco de dados
            result = await db.execute(select(Router).filter(Router.is_active == True))
            routers = result.scalars().all()
            
            router_list = []
            for router in routers:
                # Converter ip_origens para formato esperado
                ip_origens_list = []
                if router.ip_origens:
                    for ip_origem in router.ip_origens:
                        ip_origens_list.append(IpOrigem(
                            id=ip_origem.get("id"),
                            name=ip_origem.get("name", ""),
                            type=ip_origem.get("type", ""),
                            ip=ip_origem.get("ip", "")
                        ))
                
                # Mapear para o formato esperado pelo frontend
                router_info = RouterInfo(
                    id=router.id,
                    name=router.name,
                    hostname=router.ip,
                    location=router.note or "Não informado",
                    status="online" if router.is_active else "offline",
                    ip_origens=ip_origens_list
                )
                router_list.append(router_info)
            
            return router_list
        except Exception as e:
            logger.error(f"Error getting routers: {e}")
            return []
    
    async def execute_query(self, request: QueryRequest, db: AsyncSession) -> QueryResponse:
        """Executa uma query de Looking Glass"""
        query_id = str(uuid.uuid4())
        
        try:
            # Buscar roteador no banco de dados
            result = await db.execute(select(Router).filter(Router.id == request.routerId))
            router = result.scalar_one_or_none()
            
            if not router:
                return QueryResponse(
                    id=query_id,
                    status="error",
                    error="Roteador não encontrado"
                )
            
            # Criar objeto de query
            query = LookingGlassQuery(
                id=query_id,
                type=request.type,
                target=request.target,
                router=router.name,
                timestamp=datetime.now(),
                status="pending"
            )
            
            # Adicionar ao cache
            self.active_queries[query_id] = query
            
            # Executar comando em background e manter referência da task
            task = asyncio.create_task(self._execute_command(query, request, router))
            self.active_tasks[query_id] = task
            
            # Adicionar callback para limpar a task quando terminar
            def cleanup_task(task_ref):
                try:
                    if query_id in self.active_tasks:
                        del self.active_tasks[query_id]
                except Exception as e:
                    logger.warning(f"Erro ao limpar task {query_id}: {e}")
            
            task.add_done_callback(cleanup_task)
            
            return QueryResponse(
                id=query_id,
                status="success"
            )
            
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            return QueryResponse(
                id=query_id,
                status="error",
                error=str(e)
            )
    
    async def _execute_command(self, query: LookingGlassQuery, request: QueryRequest, router: Router):
        """Executa o comando específico baseado no tipo"""
        try:
            query.status = "running"
            logger.info(f"Executando comando {request.type} para {request.target} no roteador {router.name}")
            
            # Pequeno delay para dar tempo ao frontend se conectar ao stream
            await asyncio.sleep(0.5)
            
            # Adicionar timeout de segurança de 90 segundos para toda a operação
            async def execute_with_timeout():
                if request.type == "ping":
                    return await self._execute_ping_ssh(router, request.target, request.options)
                elif request.type == "traceroute":
                    return await self._execute_traceroute_ssh(router, request.target, request.options)
                elif request.type == "bgp":
                    return await self._execute_bgp_lookup_ssh(router, request.target, request.options)
                elif request.type == "bgp-summary":
                    return await self._execute_bgp_summary_ssh(router, request.target, request.options)
                else:
                    raise ValueError(f"Tipo de query não suportado: {request.type}")
            
            # Executar com timeout de 90 segundos
            output = await asyncio.wait_for(execute_with_timeout(), timeout=90.0)
            
            query.output = output
            query.status = "completed"
            logger.info(f"Comando {request.type} executado com sucesso para {request.target}")
            logger.info(f"Output length: {len(output) if output else 0} characters")
            
        except asyncio.TimeoutError:
            error_msg = f"Timeout ao executar comando {request.type} no roteador {router.name} (limite: 90s)"
            logger.error(error_msg)
            query.error = error_msg
            query.status = "error"
        except paramiko.AuthenticationException as e:
            error_msg = f"Erro de autenticação SSH no roteador {router.name}: {str(e)}"
            logger.error(error_msg)
            query.error = error_msg
            query.status = "error"
        except paramiko.SSHException as e:
            error_msg = f"Erro de conexão SSH no roteador {router.name}: {str(e)}"
            logger.error(error_msg)
            query.error = error_msg
            query.status = "error"
        except Exception as e:
            error_msg = f"Erro ao executar comando {request.type}: {str(e)}"
            logger.error(error_msg)
            query.error = error_msg
            query.status = "error"
    
    async def _execute_ping(self, target: str, options: dict) -> str:
        """Executa comando ping"""
        count = options.get("count", 4)
        source_ip = options.get("sourceIp")
        
        cmd = ["ping", "-c", str(count)]
        
        # Adicionar IP de origem se fornecido
        if source_ip:
            cmd.extend(["-I", source_ip])
        
        cmd.append(target)
        
        try:
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                return stdout.decode()
            else:
                return f"Erro: {stderr.decode()}"
                
        except Exception as e:
            return f"Erro ao executar ping: {e}"
    
    async def _execute_traceroute(self, target: str, options: dict) -> str:
        """Executa comando traceroute"""
        max_hops = options.get("maxHops", 30)
        source_ip = options.get("sourceIp")
        
        cmd = ["traceroute", "-m", str(max_hops)]
        
        # Adicionar IP de origem se fornecido
        if source_ip:
            cmd.extend(["-s", source_ip])
        
        cmd.append(target)
        
        try:
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                return stdout.decode()
            else:
                return f"Erro: {stderr.decode()}"
                
        except Exception as e:
            return f"Erro ao executar traceroute: {e}"
    
    async def _execute_bgp_lookup(self, target: str, options: dict) -> str:
        """Executa BGP lookup (simulado)"""
        # Em um ambiente real, isso se conectaria ao sistema BGP
        return f"""BGP Lookup para {target}:

Network          Next Hop            Metric LocPrf Weight Path
*> {target}/24    192.168.1.1              0         32768 i
*  {target}/24    10.0.0.1                 0    100      0 65001 i

Total de 2 rotas para {target}"""

    async def _execute_ping_ssh(self, router: Router, target: str, options: dict) -> str:
        """Executa comando ping via SSH no roteador - CORRIGIDO para roteadores que limitam canais SSH"""
        try:
            # Buscar o IP de origem pelo ID (obrigatório para ping)
            source_ip = None
            source_ip_identifier = options.get("sourceIp")
            
            # O sourceIp é obrigatório para ping
            if not source_ip_identifier:
                available_ips = []
                if router.ip_origens:
                    available_ips = [f"{ip.get('ip')} (ID: {ip.get('id')})" for ip in router.ip_origens]
                return f"Erro: IP de origem é obrigatório para ping. IPs disponíveis: {', '.join(available_ips) if available_ips else 'Nenhum'}"
            
            if router.ip_origens:
                # Primeiro tenta buscar por ID
                try:
                    source_ip_id = int(source_ip_identifier)
                    for ip_origem in router.ip_origens:
                        if ip_origem.get("id") == source_ip_id:
                            source_ip = ip_origem.get("ip")
                            break
                    if not source_ip:
                        available_ips = [f"{ip.get('ip')} (ID: {ip.get('id')})" for ip in router.ip_origens]
                        return f"Erro: IP de origem com ID {source_ip_id} não encontrado neste roteador. IPs disponíveis: {', '.join(available_ips)}"
                except (ValueError, TypeError):
                    # Se não for um número, tenta buscar pelo próprio IP
                    for ip_origem in router.ip_origens:
                        if ip_origem.get("ip") == source_ip_identifier:
                            source_ip = ip_origem.get("ip")
                            break
                    if not source_ip:
                        available_ips = [f"{ip.get('ip')} (ID: {ip.get('id')})" for ip in router.ip_origens]
                        return f"Erro: IP de origem '{source_ip_identifier}' não encontrado. IPs disponíveis: {', '.join(available_ips)}"
            else:
                return "Erro: Este roteador não possui IPs de origem configurados."
            
            if not source_ip:
                return "Erro: Não foi possível determinar o IP de origem."

            # Determinar se é IPv6
            is_ipv6 = ":" in target
            
            import paramiko
            import base64
            
            # Decodificar senha
            try:
                password = base64.b64decode(router.ssh_password.encode()).decode()
            except:
                # Se falhar na decodificação, usar a senha como está (caso não esteja codificada)
                password = router.ssh_password
            
            # CORREÇÃO: Usar uma nova conexão SSH para cada comando devido à limitação do roteador
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            logger.info(f"Looking Glass: Conectando via SSH ao roteador {router.ip}:{router.ssh_port} para ping")
            
            client.connect(
                hostname=router.ip,
                port=router.ssh_port,
                username=router.ssh_user,
                password=password,
                timeout=10
            )
            
            # Comando ping com os parâmetros corretos:
            # ping -c 30 -m 1 -a <ip_de_origem> <ip_de_destino>
            if is_ipv6:
                command = f"ping ipv6 -c 30 -m 1 -a {source_ip} {target}"
            else:
                command = f"ping -c 30 -m 1 -a {source_ip} {target}"
            
            logger.info(f"Looking Glass: Executando comando ping: {command}")
            
            # Executar comando diretamente com timeout adequado
            stdin, stdout, stderr = client.exec_command(command, timeout=90)
            
            # Configurar timeout nos canais para evitar travamento
            stdout.channel.settimeout(90.0)
            stderr.channel.settimeout(90.0)
            
            output = stdout.read().decode('utf-8', errors='ignore')
            error = stderr.read().decode('utf-8', errors='ignore')
            
            # Aguardar o comando terminar para evitar problemas de conexão
            exit_status = stdout.channel.recv_exit_status()
            
            client.close()
            
            # Incluir erro na saída se houver - EXATAMENTE como no router.py
            if error:
                logger.warning(f"Looking Glass: Stderr do comando ping: {error}")
                output += f"\n{error}"
            
            logger.info(f"Looking Glass: Comando ping executado com sucesso (exit: {exit_status})")
            return output
            
        except paramiko.ChannelException as e:
            error_msg = f"Erro de canal SSH (roteador pode estar limitando sessões): {str(e)}"
            logger.error(error_msg)
            return error_msg
        except Exception as e:
            return f"Erro ao executar ping: {str(e)}"

    async def _execute_traceroute_ssh(self, router: Router, target: str, options: dict) -> str:
        """Executa comando traceroute via SSH no roteador - mesmo padrão do router.py"""
        try:
            # Buscar o IP de origem pelo ID ou pelo próprio IP (se fornecido)
            source_ip = None
            source_ip_identifier = options.get("sourceIp")
            
            if source_ip_identifier and router.ip_origens:
                # Primeiro tenta buscar por ID
                try:
                    source_ip_id = int(source_ip_identifier)
                    for ip_origem in router.ip_origens:
                        if ip_origem.get("id") == source_ip_id:
                            source_ip = ip_origem.get("ip")
                            break
                    if not source_ip:
                        return f"Erro: IP de origem com ID {source_ip_id} não encontrado neste roteador"
                except (ValueError, TypeError):
                    # Se não for um número, tenta buscar pelo próprio IP
                    for ip_origem in router.ip_origens:
                        if ip_origem.get("ip") == source_ip_identifier:
                            source_ip = ip_origem.get("ip")
                            break
                    if not source_ip:
                        available_ips = [f"{ip.get('ip')} (ID: {ip.get('id')})" for ip in router.ip_origens]
                        return f"Erro: IP de origem '{source_ip_identifier}' não encontrado. IPs disponíveis: {', '.join(available_ips)}"
            
            # Determinar se é IPv6
            is_ipv6 = ":" in target
            
            import paramiko
            import base64
            
            # Decodificar senha
            try:
                password = base64.b64decode(router.ssh_password.encode()).decode()
            except:
                # Se falhar na decodificação, usar a senha como está (caso não esteja codificada)
                password = router.ssh_password
            
            # Conectar via SSH - mesmo padrão do router.py
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                hostname=router.ip,
                port=router.ssh_port,
                username=router.ssh_user,
                password=password,
                timeout=10
            )
            
            # Configurar comando traceroute com a sintaxe correta
            max_hops = options.get("maxHops", 30)
            
            # Montar comando com a sintaxe correta fornecida pelo usuário
            if is_ipv6:
                if source_ip:
                    command = f"tracert ipv6 -a {source_ip} -w 1000 -q 1 -m {max_hops} {target}"
                else:
                    command = f"tracert ipv6 -w 1000 -q 1 -m {max_hops} {target}"
            else:
                if source_ip:
                    command = f"tracert -as -a {source_ip} -w 1000 -q 1 -m {max_hops} {target}"
                else:
                    command = f"tracert -as -w 1000 -q 1 -m {max_hops} {target}"
            
            # Executar comando diretamente - mesmo padrão do router.py
            stdin, stdout, stderr = client.exec_command(command, timeout=120)
            output = stdout.read().decode('utf-8', errors='ignore')
            error = stderr.read().decode('utf-8', errors='ignore')
            
            client.close()
            
            # Incluir erro na saída se houver - mesmo padrão do router.py
            if error:
                output += f"\n{error}"
                
            return output
            
        except Exception as e:
            return f"Erro ao executar traceroute: {e}"

    async def _execute_bgp_lookup_ssh(self, router: Router, target: str, options: dict) -> str:
        """Executa BGP lookup via SSH no roteador - mesmo padrão do router.py"""
        try:
            # Determinar se é IPv6
            is_ipv6 = ":" in target
            
            import paramiko
            import base64
            
            # Decodificar senha
            try:
                password = base64.b64decode(router.ssh_password.encode()).decode()
            except:
                # Se falhar na decodificação, usar a senha como está (caso não esteja codificada)
                password = router.ssh_password
            
            # Conectar via SSH - mesmo padrão do router.py
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                hostname=router.ip,
                port=router.ssh_port,
                username=router.ssh_user,
                password=password,
                timeout=10
            )
            
            # Montar comando BGP
            if is_ipv6:
                command = f"display bgp ipv6 routing-table {target} | no-more"
            else:
                command = f"display bgp routing-table {target} | no-more"
            
            # Executar comando diretamente - mesmo padrão do router.py
            stdin, stdout, stderr = client.exec_command(command, timeout=30)
            output = stdout.read().decode('utf-8', errors='ignore')
            error = stderr.read().decode('utf-8', errors='ignore')
            
            client.close()
            
            # Incluir erro na saída se houver - mesmo padrão do router.py
            if error:
                output += f"\n{error}"
                
            return output if output.strip() else f"Nenhuma rota BGP encontrada para {target}"
            
        except Exception as e:
            return f"Erro ao executar BGP lookup: {e}"
    
    async def _execute_bgp_summary_ssh(self, router: Router, target: str, options: dict) -> str:
        """Executa BGP lookup resumido (as-path) via SSH no roteador"""
        try:
            # Determinar se é IPv6
            is_ipv6 = ":" in target
            
            import paramiko
            import base64
            
            # Decodificar senha
            try:
                password = base64.b64decode(router.ssh_password.encode()).decode()
            except:
                # Se falhar na decodificação, usar a senha como está (caso não esteja codificada)
                password = router.ssh_password
            
            # Conectar via SSH - mesmo padrão do router.py
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                hostname=router.ip,
                port=router.ssh_port,
                username=router.ssh_user,
                password=password,
                timeout=10
            )
            
            # Montar comando BGP resumido com as-path
            if is_ipv6:
                command = f"display bgp ipv6 routing-table {target} as-path | no-more"
            else:
                command = f"display bgp routing-table {target} as-path | no-more"
            
            # Executar comando diretamente - mesmo padrão do router.py
            stdin, stdout, stderr = client.exec_command(command, timeout=30)
            output = stdout.read().decode('utf-8', errors='ignore')
            error = stderr.read().decode('utf-8', errors='ignore')
            
            client.close()
            
            # Incluir erro na saída se houver - mesmo padrão do router.py
            if error:
                output += f"\n{error}"
                
            return output if output.strip() else f"Nenhuma rota BGP encontrada para {target}"
            
        except Exception as e:
            return f"Erro ao executar BGP lookup resumido: {e}"

    def get_query(self, query_id: str) -> LookingGlassQuery:
        """Retorna uma query específica"""
        if query_id in self.active_queries:
            return self.active_queries[query_id]
        
        raise ValueError(f"Query {query_id} não encontrada")

# Instância global do serviço
looking_glass_service = LookingGlassService()
