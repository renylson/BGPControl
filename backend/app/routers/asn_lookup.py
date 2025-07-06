"""
Endpoint para consulta de informações de ASN usando APIs públicas
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import asyncio
from typing import Optional

router = APIRouter()

class ASNInfo(BaseModel):
    asn: int
    name: str
    description: Optional[str] = None
    country: Optional[str] = None

async def get_asn_info_bgpview(asn: int) -> Optional[ASNInfo]:
    """Consulta informações do ASN usando BGPView API"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"https://api.bgpview.io/asn/{asn}")
            response.raise_for_status()
            
            data = response.json()
            if data and data.get("data"):
                asn_data = data["data"]
                return ASNInfo(
                    asn=asn,
                    name=asn_data.get("name") or asn_data.get("description_short") or "Nome não encontrado",
                    description=asn_data.get("description_full") or asn_data.get("description_short") or None,
                    country=asn_data.get("country_code") or None
                )
    except Exception as e:
        print(f"Erro ao consultar BGPView: {e}")
        return None

async def get_asn_info_peeringdb(asn: int) -> Optional[ASNInfo]:
    """Consulta informações do ASN usando PeeringDB API"""
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(f"https://www.peeringdb.com/api/net", params={"asn": asn})
            response.raise_for_status()
            
            data = response.json()
            if data and data.get("data") and len(data["data"]) > 0:
                asn_data = data["data"][0]
                return ASNInfo(
                    asn=asn,
                    name=asn_data.get("name") or "Nome não encontrado",
                    description=asn_data.get("info_general") or None,
                    country=asn_data.get("country") or None
                )
    except Exception as e:
        print(f"Erro ao consultar PeeringDB: {e}")
        return None

@router.get("/asn/{asn}", response_model=ASNInfo)
async def lookup_asn(asn: int):
    """
    Consulta informações de um ASN usando APIs públicas
    """
    if asn <= 0:
        raise HTTPException(status_code=400, detail="ASN inválido")
    
    # Tentar primeiro BGPView
    asn_info = await get_asn_info_bgpview(asn)
    
    # Se não encontrou, tentar PeeringDB
    if not asn_info:
        asn_info = await get_asn_info_peeringdb(asn)
    
    if not asn_info:
        raise HTTPException(status_code=404, detail="ASN não encontrado nas bases de dados públicas")
    
    return asn_info
