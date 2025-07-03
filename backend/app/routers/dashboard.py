from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.peering import Peering
from app.models.peering_group import PeeringGroup
from app.models.router import Router
from app.core.config import SessionLocal
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

@router.get("/status/")
async def dashboard_status(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Conta roteadores
    result = await db.execute(select(Router))
    routers = result.scalars().all()
    total_routers = len(routers)
    active_routers = sum(1 for r in routers if r.is_active)
    
    # Conta peerings
    result = await db.execute(select(Peering))
    peerings = result.scalars().all()
    total_peerings = len(peerings)
    active_peerings = sum(1 for p in peerings if p.is_active)
    ipv4_peerings = sum(1 for p in peerings if p.type == 'IPv4')
    ipv6_peerings = sum(1 for p in peerings if p.type == 'IPv6')
    
    # Conta grupos de peerings
    result = await db.execute(select(PeeringGroup))
    grupos = result.scalars().all()
    total_grupos = len(grupos)
    
    return {
        "routers": {
            "total": total_routers,
            "active": active_routers
        },
        "peerings": {
            "total": total_peerings,
            "active": active_peerings,
            "ipv4": ipv4_peerings,
            "ipv6": ipv6_peerings
        },
        "groups": {
            "total": total_grupos
        },
        "sessions": {
            "total": 0,  # Placeholder - implementar posteriormente
            "up": 0,
            "down": 0
        }
    }
