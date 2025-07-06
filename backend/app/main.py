

from fastapi import FastAPI
from app.routers import user, router, peering, peering_group, ssh, ssh_bgp, ssh_bgp_group, peering_group_stream, peering_stream, dashboard, looking_glass, audit
from app.middleware.audit import AuditMiddleware

app = FastAPI()

# Adicionar middleware de auditoria
app.add_middleware(AuditMiddleware)

# CORS direto no main.py (após criar o app)
from fastapi.middleware.cors import CORSMiddleware
origins = [
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir todos os routers com prefixo /api
app.include_router(user.router, prefix="/api/users", tags=["users"])
app.include_router(router.router, prefix="/api/routers", tags=["routers"])
app.include_router(peering.router, prefix="/api/peerings", tags=["peerings"])
app.include_router(peering_group.router, prefix="/api/peering-groups", tags=["peering-groups"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(looking_glass.router, prefix="/api/looking-glass", tags=["looking-glass"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(ssh.router, prefix="/api", tags=["ssh"])
app.include_router(ssh_bgp.router, prefix="/api", tags=["ssh-bgp"])
app.include_router(ssh_bgp_group.router, prefix="/api", tags=["ssh-bgp-group"])

app.include_router(peering_group_stream.router, prefix="/api/peering-groups", tags=["peering-groups"])
app.include_router(peering_stream.router, prefix="/api/peerings", tags=["peerings"])

@app.get("/")
def read_root():
    return {"message": "SaaS BGPControl API rodando!"}
