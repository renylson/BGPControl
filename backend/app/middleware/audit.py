from fastapi import Request, Response
from fastapi.security import HTTPBearer
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.core.deps import get_db
from app.core.security import decode_token
import json
import time
from typing import Optional

security = HTTPBearer()

class AuditMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Capturar dados da requisição
        method = request.method
        url = str(request.url)
        path = request.url.path
        ip_address = self.get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # Tentar obter o usuário do token
        user_id = await self.get_user_from_token(request)
        
        # Capturar body da requisição (se houver)
        request_body = None
        if method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    request_body = body.decode("utf-8")
            except Exception:
                request_body = None
        
        # Processar a requisição
        response = await call_next(request)
        
        # Calcular tempo de resposta
        process_time = time.time() - start_time
        
        # Determinar se deve fazer log (ignorar alguns endpoints)
        should_log = self.should_log(path, method)
        
        if should_log:
            # Determinar ação e tipo de recurso
            action, resource_type, resource_id = self.parse_action_from_request(
                method, path, response.status_code
            )
            
            # Salvar log de auditoria se usuário estiver autenticado
            if user_id:
                await self.save_audit_log(
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    method=method,
                    endpoint=path,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    request_data=request_body,
                    response_status=response.status_code,
                    details=f"Response time: {process_time:.3f}s"
                )
        
        return response
    
    def get_client_ip(self, request: Request) -> str:
        """Obter IP do cliente considerando proxies"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
            
        return request.client.host if request.client else "unknown"
    
    async def get_user_from_token(self, request: Request) -> Optional[int]:
        """Extrair user_id do token JWT"""
        try:
            authorization = request.headers.get("Authorization")
            if not authorization or not authorization.startswith("Bearer "):
                return None
                
            token = authorization.replace("Bearer ", "")
            payload = decode_token(token)
            if payload:
                username = payload.get("sub")
                if username:
                    # Buscar user_id pelo username
                    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
                    from sqlalchemy.orm import sessionmaker
                    from sqlalchemy.future import select
                    from app.models.user import User
                    from app.core.config import DATABASE_URL
                    
                    engine = create_async_engine(DATABASE_URL)
                    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
                    
                    async with SessionLocal() as db:
                        result = await db.execute(select(User).where(User.username == username))
                        user = result.scalars().first()
                        if user:
                            return user.id
        except Exception:
            pass
        return None
    
    def should_log(self, path: str, method: str) -> bool:
        """Determinar se deve fazer log da requisição"""
        # Não fazer log de endpoints estáticos ou de health check
        skip_paths = [
            "/docs", "/redoc", "/openapi.json", "/favicon.ico",
            "/health", "/static"
        ]
        
        # Adicionar verificação exata para root
        if path == "/":
            return False
            
        for skip_path in skip_paths:
            if path.startswith(skip_path):
                return False
        
        # Fazer log de todas as operações em endpoints da API
        important_endpoints = ["/users", "/routers", "/peerings", "/peering-groups", "/dashboard", "/audit"]
        
        # Se for um endpoint importante, fazer log
        for endpoint in important_endpoints:
            if endpoint in path:
                return True
        
        # Para outros endpoints, fazer log apenas de POST, PUT, PATCH, DELETE
        if method in ["POST", "PUT", "PATCH", "DELETE"]:
            return True
        
        return False
    
    def parse_action_from_request(self, method: str, path: str, status_code: int) -> tuple:
        """Determinar ação, tipo de recurso e ID do recurso"""
        # Mapear método HTTP para ação
        action_map = {
            "POST": "CREATE",
            "PUT": "UPDATE", 
            "PATCH": "UPDATE",
            "DELETE": "DELETE",
            "GET": "READ"
        }
        
        action = action_map.get(method, "UNKNOWN")
        
        # Determinar tipo de recurso baseado no path
        resource_type = "unknown"
        resource_id = None
        
        if "/users" in path:
            resource_type = "user"
            if path.endswith("/login"):
                action = "LOGIN"
            elif path.endswith("/logout"):
                action = "LOGOUT"
        elif "/routers" in path:
            resource_type = "router"
        elif "/peerings" in path:
            resource_type = "peering"
        elif "/peering-groups" in path:
            resource_type = "peering_group"
        elif "/dashboard" in path:
            resource_type = "dashboard"
            action = "VIEW"
        elif "/looking-glass" in path:
            resource_type = "looking_glass"
            action = "QUERY"
        elif "/ssh" in path:
            resource_type = "ssh"
            action = "EXECUTE"
        
        # Tentar extrair ID do recurso do path
        path_parts = path.strip("/").split("/")
        for i, part in enumerate(path_parts):
            if part.isdigit():
                resource_id = part
                break
        
        # Ajustar ação baseado no status code
        if status_code >= 400:
            action = f"{action}_FAILED"
        elif status_code == 201:
            action = "CREATE"
        
        return action, resource_type, resource_id
    
    async def save_audit_log(self, **kwargs):
        """Salvar log de auditoria no banco de dados"""
        try:
            from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
            from sqlalchemy.orm import sessionmaker
            from app.core.config import DATABASE_URL
            
            engine = create_async_engine(DATABASE_URL)
            SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
            
            async with SessionLocal() as db:
                # Criar registro de auditoria
                audit_log = AuditLog(**kwargs)
                db.add(audit_log)
                await db.commit()
                
        except Exception as e:
            print(f"Erro ao salvar log de auditoria: {e}")
            import traceback
            traceback.print_exc()
