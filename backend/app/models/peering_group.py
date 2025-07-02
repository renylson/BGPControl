from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.models.user import Base

# Tabela de associação grupo <-> peering
peering_group_association = Table(
    "peering_group_association",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("peering_groups.id"), primary_key=True),
    Column("peering_id", Integer, ForeignKey("peerings.id"), primary_key=True)
)

class PeeringGroup(Base):
    __tablename__ = "peering_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    router_id = Column(Integer, ForeignKey("routers.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    peerings = relationship("Peering", secondary=peering_group_association, backref="groups")
