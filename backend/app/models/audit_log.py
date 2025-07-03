from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.user import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    resource_type = Column(String(50), nullable=False)  # user, router, peering, etc
    resource_id = Column(String(50), nullable=True)  # ID do recurso afetado
    method = Column(String(10), nullable=False)  # GET, POST, PUT, DELETE
    endpoint = Column(String(200), nullable=False)  # URL do endpoint
    ip_address = Column(String(45), nullable=True)  # IP do usuário
    user_agent = Column(Text, nullable=True)  # User agent do browser
    request_data = Column(Text, nullable=True)  # Dados da requisição (JSON)
    response_status = Column(Integer, nullable=True)  # Status code da resposta
    details = Column(Text, nullable=True)  # Detalhes adicionais
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relacionamento com User (pode ser nulo para tentativas de login inválidas)
    user = relationship("User", back_populates="audit_logs")
