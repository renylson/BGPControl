# SaaS Gerenciamento BGP

Este projeto é um sistema SaaS para cadastro e gerenciamento de roteadores, peerings BGP, grupos de peerings e usuários, com autenticação JWT e integração SSH para comandos em roteadores.

## Tecnologias
- FastAPI
- PostgreSQL
- SQLAlchemy
- JWT
- Paramiko (SSH)

## Estrutura inicial
- app/main.py: ponto de entrada FastAPI
- app/core/: configurações e segurança
- app/models/: modelos ORM
- app/schemas/: schemas Pydantic
- app/services/: regras de negócio
- app/routers/: rotas da API

## Como rodar localmente
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Deploy
- O deploy será feito diretamente no servidor, sem Docker.
- Recomenda-se usar systemd e nginx para produção.

## Próximos passos
- Implementar modelos, schemas e rotas para cada módulo.
- Configurar autenticação JWT.
- Integrar comandos SSH para status/ativação/desativação BGP.
