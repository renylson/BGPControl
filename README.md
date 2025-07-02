# BGPView - Sistema de Gerenciamento BGP

Sistema completo para gerenciamento de peerings BGP, roteadores e grupos de peering com backend em FastAPI e frontend em React/TypeScript. O sistema permite cadastrar roteadores, configurar peerings BGP, agrupar peerings e executar comandos SSH nos equipamentos de forma automatizada.

## 📋 Sumário

- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação em Debian Limpo](#-instalação-em-debian-limpo)
  - [1. Atualizando o Sistema](#1-atualizando-o-sistema)
  - [2. Instalação do PostgreSQL](#2-instalação-do-postgresql)
  - [3. Instalação do Python 3.11](#3-instalação-do-python-311)
  - [4. Instalação do Node.js](#4-instalação-do-nodejs)
  - [5. Instalação do Git](#5-instalação-do-git)
  - [6. Clonando o Projeto](#6-clonando-o-projeto)
  - [7. Configuração do Backend](#7-configuração-do-backend)
  - [8. Configuração do Frontend](#8-configuração-do-frontend)
- [Configuração de Produção](#-configuração-de-produção)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Uso do Sistema](#-uso-do-sistema)
- [Comandos Úteis](#-comandos-úteis)
- [Troubleshooting](#-troubleshooting)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 🚀 Funcionalidades

### Backend (FastAPI)
- **Gerenciamento de Usuários**: Sistema de autenticação JWT com perfis (admin, operador, visualizador)
- **Gerenciamento de Roteadores**: Cadastro de roteadores com IP, porta SSH, credenciais e ASN
- **Gerenciamento de Peerings**: Cadastro e controle de sessões BGP individuais
- **Grupos de Peering**: Agrupamento de múltiplos peerings para operações em lote
- **Integração SSH**: Execução de comandos BGP remotos via Paramiko
- **Operações BGP**: Ativação/desativação de sessões BGP individuais ou em grupo
- **API RESTful**: Interface completa para todas as operações
- **Banco de Dados**: PostgreSQL com SQLAlchemy ORM e migrações Alembic

### Frontend (React/TypeScript)
- **Interface Moderna**: Material-UI com tema customizado
- **Dashboard**: Visão geral do status de peerings e roteadores
- **CRUD Completo**: Interfaces para gerenciar usuários, roteadores, peerings e grupos
- **Operações BGP**: Controles para ativar/desativar peerings via SSH
- **Autenticação**: Sistema de login com persistência de sessão
- **Responsivo**: Interface adaptável para desktop e mobile
- **Testes**: Suite de testes com Jest e Testing Library

---

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   React/TS      │◄──►│    FastAPI      │◄──►│   Database      │
│   Material-UI   │    │   SQLAlchemy    │    │                 │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Roteadores    │
                       │     BGP         │
                       │   Via SSH       │
                       └─────────────────┘
```

### Tecnologias Utilizadas

**Backend:**
- FastAPI 0.115.14
- SQLAlchemy 2.0.41 (ORM)
- PostgreSQL (AsyncPG)
- Alembic (Migrações)
- Paramiko 3.5.1 (SSH)
- JWT (Autenticação)
- Uvicorn (ASGI Server)

**Frontend:**
- React 19.1.0
- TypeScript 5.8.3
- Material-UI 7.2.0
- React Router DOM 6.30.1
- Axios 1.10.0
- Vite 7.0.0 (Build Tool)
- Jest (Testes)

---

## 📦 Pré-requisitos

- **Sistema Operacional**: Debian 11+ (Bullseye) ou Ubuntu 20.04+
- **RAM**: Mínimo 2GB, recomendado 4GB+
- **Armazenamento**: Mínimo 10GB livres
- **Rede**: Acesso à internet para downloads
- **Permissões**: Usuário com sudo

---

## � Instalação Rápida (Recomendada)

### Instalador Automatizado

O BGPView possui um instalador automatizado que configura tudo em um Debian limpo:

```bash
# Baixar e executar o instalador
wget https://raw.githubusercontent.com/renylson/bgpview/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

**O instalador perguntará sobre:**
- ✅ Tipo de acesso (IP ou domínio)
- ✅ Configuração SSL/HTTPS (Let's Encrypt)
- ✅ Senhas do banco de dados
- ✅ Credenciais do usuário administrador
- ✅ Configurações de segurança

**O que o instalador faz automaticamente:**
- 🔄 Atualiza o sistema Debian
- 🐘 Instala e configura PostgreSQL
- 🐍 Instala Python 3.11
- 📦 Instala Node.js 18.x LTS
- 🔧 Configura ambiente virtual e dependências
- 🌐 Configura Nginx como proxy reverso
- 🔒 Configura SSL/HTTPS (opcional)
- 🛡️ Configura firewall
- 👤 Cria usuário administrador
- 📋 Cria scripts de manutenção

### Desinstalação

Para remover completamente o BGPView:

```bash
# Baixar e executar o desinstalador
wget https://raw.githubusercontent.com/renylson/bgpview/main/uninstall.sh
chmod +x uninstall.sh
sudo ./uninstall.sh
```

### Teste da Instalação

Para validar se tudo está funcionando:

```bash
# Baixar e executar o teste
wget https://raw.githubusercontent.com/renylson/bgpview/main/test-install.sh
chmod +x test-install.sh
sudo ./test-install.sh
```

### Instalação Não-Interativa

Para instalações automatizadas (CI/CD, múltiplos servidores):

```bash
# Copiar arquivo de exemplo
wget https://raw.githubusercontent.com/renylson/bgpview/main/config.env.example -O config.env

# Editar configurações
nano config.env

# Executar instalação
sudo ./install.sh --config config.env
```

📖 **Documentação completa**: [INSTALLER.md](INSTALLER.md)

---

## 🔧 Instalação Manual (Avançada)

Se preferir instalar manualmente ou personalizar a instalação:

### 1. Atualizando o Sistema

```bash
# Atualizar repositórios e sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
```

### 2. Instalação do PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib postgresql-client

# Iniciar e habilitar o serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verificar status
sudo systemctl status postgresql

# Configurar usuário e banco de dados
sudo -u postgres psql << EOF
CREATE USER bgpview WITH PASSWORD 'Vls@021130';
CREATE DATABASE bgpview OWNER bgpview;
GRANT ALL PRIVILEGES ON DATABASE bgpview TO bgpview;
\q
EOF

# Testar conexão
psql -h localhost -U bgpview -d bgpview -c "SELECT version();"
```

### 3. Instalação do Python 3.11

```bash
# Debian 11 (instalar Python 3.11 via deadsnakes)
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa -y || echo "deb http://deb.debian.org/debian bullseye-backports main" | sudo tee /etc/apt/sources.list.d/backports.list

# Para Debian, instalar do repositório oficial
sudo apt update
sudo apt install -y python3.11 python3.11-dev python3.11-venv python3-pip

# Verificar instalação
python3.11 --version
```

### 4. Instalação do Node.js

```bash
# Instalar Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v18.x.x
npm --version   # Deve mostrar 9.x.x ou superior

# Atualizar npm para versão mais recente
sudo npm install -g npm@latest
```

### 5. Instalação do Git

```bash
# Instalar Git
sudo apt install -y git

# Configurar Git (opcional, mas recomendado)
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"

# Verificar instalação
git --version
```

### 6. Clonando o Projeto

```bash
# Navegar para diretório de trabalho
cd /opt
sudo mkdir -p bgpview
sudo chown $USER:$USER bgpview
cd bgpview

# Clonar o repositório
git clone https://github.com/renylson/bgpview.git .

# Verificar estrutura
ls -la
```

### 7. Configuração do Backend

```bash
# Navegar para o diretório do backend
cd /opt/bgpview/backend

# Criar ambiente virtual Python
python3.11 -m venv .venv

# Ativar ambiente virtual
source .venv/bin/activate

# Atualizar pip
pip install --upgrade pip

# Instalar dependências
pip install -r requirements.txt

# Criar arquivo de configuração
cp .env.example .env

# Editar variáveis de ambiente
nano .env
```

**Conteúdo do arquivo `.env`:**
```bash
# Configuração do Banco de Dados
DATABASE_URL=postgresql+asyncpg://bgpview:Vls%40021130@localhost/bgpview

# Chave secreta para JWT (gerar uma nova!)
SECRET_KEY=sua_chave_secreta_super_segura_aqui_com_32_caracteres_min

# Configurações opcionais
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Gerar chave secreta segura:**
```bash
# Gerar chave aleatória
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

```bash
# Executar migrações do banco de dados
alembic upgrade head

# Ou criar tabelas manualmente (se não houver migrações)
python3 -c "from app.core.init_db import init_db; import asyncio; asyncio.run(init_db())"

# Testar o backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Verificar se o backend está funcionando:**
```bash
# Em outro terminal, testar API
curl http://localhost:8000/docs

# Ou abrir no navegador: http://seu-servidor:8000/docs
```

### 8. Configuração do Frontend

```bash
# Em novo terminal, navegar para frontend
cd /opt/bgpview/frontend

# Instalar dependências
npm install

# Criar arquivo de configuração (se necessário)
cp .env.example .env 2>/dev/null || touch .env

# Editar configurações do frontend
nano .env
```

**Conteúdo do arquivo `.env` do frontend:**
```bash
# URL da API do backend
VITE_API_URL=http://localhost:8000

# Outras configurações se necessário
VITE_APP_NAME=BGPView
VITE_APP_VERSION=1.0.0
```

```bash
# Executar em modo desenvolvimento
npm run dev

# Ou fazer build para produção
npm run build
npm run preview
```

**Verificar se o frontend está funcionando:**
- Abrir navegador em: `http://seu-servidor:3000`
- Deve carregar a interface de login

---

## 🚀 Configuração de Produção

### Configuração do Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Criar configuração do site
sudo nano /etc/nginx/sites-available/bgpview
```

**Conteúdo do arquivo de configuração do Nginx:**
```nginx
# Configuração para produção
server {
    listen 80;
    server_name seu-dominio.com.br;  # Alterar para seu domínio

    # Frontend estático
    location / {
        root /opt/bgpview/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Documentação da API
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /opt/bgpview/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Habilitar site
sudo ln -s /etc/nginx/sites-available/bgpview /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remover site padrão

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Configuração do Systemd (Backend)

```bash
# Criar serviço systemd para o backend
sudo nano /etc/systemd/system/bgpview-backend.service
```

**Conteúdo do arquivo de serviço:**
```ini
[Unit]
Description=BGPView Backend API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/opt/bgpview/backend
Environment=PATH=/opt/bgpview/backend/.venv/bin
EnvironmentFile=/opt/bgpview/backend/.env
ExecStart=/opt/bgpview/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Ajustar permissões
sudo chown -R www-data:www-data /opt/bgpview

# Habilitar e iniciar serviço
sudo systemctl daemon-reload
sudo systemctl enable bgpview-backend
sudo systemctl start bgpview-backend

# Verificar status
sudo systemctl status bgpview-backend
```

### SSL/TLS com Certbot (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com.br

# Testar renovação automática
sudo certbot renew --dry-run
```

---

## 🔐 Variáveis de Ambiente

### Backend (.env)
```bash
# Banco de dados
DATABASE_URL=postgresql+asyncpg://bgpview:senha@localhost/bgpview

# Segurança
SECRET_KEY=chave_secreta_de_32_caracteres_ou_mais
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Configurações opcionais
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,https://seu-dominio.com.br
```

### Frontend (.env)
```bash
# API
VITE_API_URL=http://localhost:8000
# ou para produção: VITE_API_URL=https://seu-dominio.com.br/api

# Aplicação
VITE_APP_NAME=BGPView
VITE_APP_VERSION=1.0.0
```

---

## 📖 Uso do Sistema

### 1. Primeiro Acesso

1. Acesse `http://seu-servidor` ou `http://localhost:3000`
2. Criar primeiro usuário admin via API:

```bash
curl -X POST "http://localhost:8000/users/register" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin",
       "password": "senha123",
       "name": "Administrador",
       "profile": "admin"
     }'
```

### 2. Fluxo de Uso

1. **Login**: Entre com credenciais criadas
2. **Cadastro de Roteadores**: Adicione seus equipamentos com IP, SSH e ASN
3. **Cadastro de Peerings**: Configure sessões BGP individuais
4. **Grupos de Peering**: Agrupe peerings para operações em lote
5. **Operações BGP**: Ative/desative sessões via interface web

### 3. Perfis de Usuário

- **Admin**: Acesso total ao sistema
- **Operador**: Pode executar operações BGP e visualizar dados
- **Visualizador**: Apenas visualização de dados

---

## ⚡ Comandos Úteis

### Scripts de Manutenção (Criados pelo Instalador)

```bash
# Ver status completo do sistema
bgpview-status

# Fazer backup completo
bgpview-backup

# Atualizar sistema para nova versão
bgpview-update
```

### Backend
```bash
# Ativar ambiente virtual
source /opt/bgpview/backend/.venv/bin/activate

# Executar em desenvolvimento
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Executar migrações
alembic upgrade head

# Criar nova migração
alembic revision --autogenerate -m "descrição da mudança"

# Ver logs do serviço
sudo journalctl -u bgpview-backend -f

# Reiniciar serviço
sudo systemctl restart bgpview-backend
```

### Frontend
```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Executar testes
npm test

# Linting
npm run lint
```

### PostgreSQL
```bash
# Conectar ao banco
psql -h localhost -U bgpview -d bgpview

# Backup do banco
pg_dump -h localhost -U bgpview bgpview > backup.sql

# Restaurar backup
psql -h localhost -U bgpview bgpview < backup.sql

# Ver conexões ativas
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname='bgpview';"
```

### Sistema
```bash
# Ver logs do sistema
sudo journalctl -xe

# Monitorar recursos
htop
df -h
free -h

# Verificar portas abertas
ss -tulpn | grep -E ':(3000|8000|5432|80|443)'

# Reiniciar todos os serviços
sudo systemctl restart bgpview-backend nginx postgresql
```

---

## 🔧 Troubleshooting

### Problemas Comuns

**1. Erro de conexão com PostgreSQL**
```bash
# Verificar se o serviço está rodando
sudo systemctl status postgresql

# Verificar logs
sudo journalctl -u postgresql -f

# Testar conexão
psql -h localhost -U bgpview -d bgpview -c "SELECT 1;"
```

**2. Backend não inicia**
```bash
# Verificar logs detalhados
sudo journalctl -u bgpview-backend -f

# Testar manualmente
cd /opt/bgpview/backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**3. Frontend não carrega**
```bash
# Verificar se a build foi feita
cd /opt/bgpview/frontend
npm run build

# Verificar configuração do Nginx
sudo nginx -t
sudo systemctl reload nginx
```

**4. Erro de SSH nos roteadores**
```bash
# Verificar conectividade
ssh usuario@ip-do-roteador

# Verificar logs do backend para erros SSH
sudo journalctl -u bgpview-backend | grep -i ssh
```

### Logs Importantes

```bash
# Backend
sudo journalctl -u bgpview-backend -f

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL
sudo journalctl -u postgresql -f
```

---

## 🤝 Contribuição

1. Fork este repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas alterações: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

### Padrões de Commit
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` formatação
- `refactor:` refatoração
- `test:` testes
- `chore:` tarefas de build/configuração

---

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Abra uma [Issue](https://github.com/renylson/bgpview/issues)
2. Consulte a [documentação da API](http://localhost:8000/docs)
3. Verifique os logs do sistema

---

**Desenvolvido com ❤️ para facilitar o gerenciamento BGP**
