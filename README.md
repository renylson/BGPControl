# BGPView

Sistema completo para gerenciamento de peerings BGP, com backend em FastAPI e frontend em React (Vite).

## Sumário
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Rodando o Backend](#rodando-o-backend)
- [Rodando o Frontend](#rodando-o-frontend)
- [Testes](#testes)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Deploy](#deploy)
- [Contribuição](#contribuição)

---

## Pré-requisitos
- Python 3.11+
- Node.js 18+
- npm ou yarn

## Instalação

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## Rodando o Backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

## Rodando o Frontend
```bash
cd frontend
npm run dev
```

## Testes

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## Variáveis de Ambiente
- Crie um arquivo `.env` em `backend/` e `frontend/` conforme os exemplos `.env.example`.
- **Nunca suba arquivos .env para o repositório!**

## Deploy
- Configure variáveis de ambiente no ambiente de produção.
- Para deploy automatizado, edite o workflow em `.github/workflows/`.

## Contribuição
1. Fork este repositório
2. Crie uma branch: `git checkout -b minha-feature`
3. Commit suas alterações: `git commit -m 'feat: minha feature'`
4. Push para o fork: `git push origin minha-feature`
5. Abra um Pull Request

---

## Licença
MIT
