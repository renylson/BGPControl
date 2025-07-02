

from fastapi import FastAPI
from app.routers import user, router, peering, peering_group, ssh, ssh_bgp, ssh_bgp_group, peering_group_stream, peering_stream

app = FastAPI()

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

app.include_router(user.router, prefix="/users", tags=["users"])
app.include_router(router.router, prefix="/routers", tags=["routers"])
app.include_router(peering.router, prefix="/peerings", tags=["peerings"])
app.include_router(peering_group.router, prefix="/peering-groups", tags=["peering-groups"])
app.include_router(ssh.router, tags=["ssh"])
app.include_router(ssh_bgp.router, tags=["ssh-bgp"])
app.include_router(ssh_bgp_group.router, tags=["ssh-bgp-group"])

app.include_router(peering_group_stream.router, prefix="/peering-groups", tags=["peering-groups"])
app.include_router(peering_stream.router, prefix="/peerings", tags=["peerings"])

@app.get("/")
def read_root():
    return {"message": "SaaS BGPView API rodando!"}
