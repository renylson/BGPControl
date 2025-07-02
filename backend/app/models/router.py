from sqlalchemy import Column, Integer, String, Boolean, JSON

from app.models.user import Base

class Router(Base):
    __tablename__ = "routers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ip = Column(String, nullable=False, unique=True)
    ssh_port = Column(Integer, nullable=False, default=22)
    ssh_user = Column(String, nullable=False)
    ssh_password = Column(String, nullable=False)  # Criptografada
    asn = Column(Integer, nullable=False)
    note = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    ip_origens = Column(JSON, nullable=True, default=list)
