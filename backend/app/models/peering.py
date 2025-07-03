from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from app.models.user import Base

class Peering(Base):
    __tablename__ = "peerings"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ip = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'IPv4' ou 'IPv6'
    remote_asn = Column(Integer, nullable=False)
    remote_asn_name = Column(String, nullable=False)
    note = Column(String, nullable=True)
    router_id = Column(Integer, ForeignKey("routers.id"), nullable=False)
    ip_origem_id = Column(BigInteger, nullable=True)  # ID do IP de origem do roteador
    is_active = Column(Boolean, default=True)
    router = relationship("Router")
