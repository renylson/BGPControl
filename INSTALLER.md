# BGPControl - Instalador Automatizado

**Desenvolvido por:** Renylson Marques  
**E-mail:** renylsonm@gmail.com

Sistema de instalação automatizada para o BGPControl em servidores Debian/Ubuntu. Este instalador demonstra competências em automação de infraestrutura, scripting shell e configuração de serviços Linux.

## 🎯 Objetivos do Instalador

Este script automatizado foi desenvolvido para:

- **Automatizar Deploy**: Instalação completa em servidor limpo
- **Configuração de Produção**: Setup otimizado para ambiente produtivo
- **Boas Práticas DevOps**: Uso de systemd, nginx, usuários dedicados
- **Segurança**: Configurações seguras por padrão
- **Monitoramento**: Logs estruturados e health checks

## 🚀 Uso Rápido

```bash
# Download do instalador
wget https://raw.githubusercontent.com/renylson/bgpcontrol/main/install.sh

# Dar permissão de execução
chmod +x install.sh

# Executar como root (recomendado)
sudo ./install.sh
```

## 📋 Processo de Instalação Automatizada

### Competências Demonstradas em DevOps

O processo de instalação implementa as seguintes práticas:

### 1. **Verificação e Validação de Sistema**
- Detecção automática do OS (Debian/Ubuntu)
- Verificação de permissões (usuário root/sudo)
- Validação de recursos mínimos (RAM, espaço em disco)
- Verificação de dependências do sistema

### 2. **Configuração Interativa Inteligente**
- Interface amigável para coleta de configurações
- Validação de inputs (IPs, portas, senhas)
- Geração automática de senhas seguras
- Configuração de domínio e SSL

### 3. **Automação de Infraestrutura**
- Atualização completa do sistema operacional
- Instalação e configuração do PostgreSQL 13+
- Setup do Python 3.11 com ambiente virtual
- Instalação do Node.js 18.x LTS

### 4. **Segurança por Design**
- Criação de usuário dedicado (`bgpcontrol`)
- Configuração de firewall (UFW)
- Permissões de arquivo restritivas
- Hash seguro de senhas de banco

### 5. **Serviços de Produção**
- Configuração do systemd para backend
- Setup do Nginx como reverse proxy
- SSL/TLS com Let's Encrypt (opcional)
- Logs estruturados e rotação automática

### 6. **Automação de Deploy**
- Clone automático do repositório
- Build de produção do frontend
- Migrações de banco automatizadas
- Criação de usuário administrador

### 7. **Monitoramento e Health Checks**
- Verificação de serviços após instalação
- Testes de conectividade automáticos
- Status de portas e processos
- Relatório final de instalação

## 🛠️ Fluxo Técnico Detalhado

### Fase 1: Preparação do Ambiente
```bash
# Verificações iniciais
- OS compatibility check
- Root/sudo verification
- Network connectivity test
- System resources validation
```

### Fase 2: Configuração do Sistema Base
```bash
# System update e dependencies
apt update && apt upgrade -y
apt install -y curl wget gnupg2 software-properties-common

# PostgreSQL installation
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | tee /etc/apt/sources.list.d/pgdg.list
apt update && apt install -y postgresql-13 postgresql-contrib-13
```

### Fase 3: Configuração do Python Environment
```bash
# Python 3.11 installation
add-apt-repository ppa:deadsnakes/ppa -y
apt install -y python3.11 python3.11-venv python3.11-dev
python3.11 -m venv /opt/bgpcontrol/backend/.venv
```

### Fase 4: Setup do Node.js
```bash
# Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

### Fase 5: Configuração da Aplicação
```bash
# User creation
useradd -r -s /bin/false -d /opt/bgpcontrol bgpcontrol

# Application setup
git clone https://github.com/renylson/bgpcontrol.git /opt/bgpcontrol
chown -R bgpcontrol:bgpcontrol /opt/bgpcontrol

# Backend setup
cd /opt/bgpcontrol/backend
source .venv/bin/activate
pip install -r requirements.txt

# Database migration
alembic upgrade head

# Frontend build
cd /opt/bgpcontrol/frontend
npm install --production
npm run build
```

### Fase 6: Configuração dos Serviços

#### Systemd Service (Backend)
```ini
[Unit]
Description=BGPControl Backend API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=exec
User=bgpcontrol
Group=bgpcontrol
WorkingDirectory=/opt/bgpcontrol/backend
Environment=PATH=/opt/bgpcontrol/backend/.venv/bin
ExecStart=/opt/bgpcontrol/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name _;
    
    # Frontend static files
    location / {
        root /opt/bgpcontrol/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
11. **Serviço Systemd** - Daemon para o backend
12. **Configuração do Nginx** - Proxy reverso e servidor web
13. **SSL/HTTPS** - Let's Encrypt (opcional)
14. **Usuário Admin** - Criação via API
15. **Firewall** - Configuração básica de segurança
16. **Scripts de Manutenção** - Ferramentas para backup e atualização

## ⚙️ Opções de Configuração

### Tipo de Acesso
- **Por IP**: Ideal para desenvolvimento ou redes internas
- **Por Domínio**: Para produção com domínio próprio

### SSL/HTTPS
- Configuração automática com Let's Encrypt
- Renovação automática via cron

### Personalização
- Senhas do banco de dados
- Credenciais do administrador
- Configurações de segurança

## 📁 Estrutura Criada

```
/opt/bgpview/                    # Diretório principal
├── backend/                     # API FastAPI
│   ├── .venv/                  # Ambiente virtual Python
│   ├── .env                    # Configurações
│   └── ...
├── frontend/                    # Interface React
│   ├── dist/                   # Build de produção
│   ├── .env                    # Configurações
│   └── ...
└── README.md

/etc/systemd/system/
└── bgpview-backend.service      # Serviço do backend

/etc/nginx/sites-available/
└── bgpview                      # Configuração Nginx

/usr/local/bin/bgpview/          # Scripts de manutenção
├── backup.sh                   # Script de backup
├── update.sh                   # Script de atualização
└── status.sh                   # Script de status

/var/backups/bgpview/            # Diretório de backups
```

## 🔧 Scripts de Manutenção

### bgpview-status
Mostra status completo do sistema:
```bash
bgpview-status
```

### bgpview-backup
Faz backup completo:
```bash
bgpview-backup
```
- Backup do banco PostgreSQL
- Backup das configurações
- Mantém últimos 7 backups

### bgpview-update
Atualiza para nova versão:
```bash
bgpview-update
```
- Backup automático antes da atualização
- Pull do código mais recente
- Atualização de dependências
- Reinício dos serviços

## 🔐 Segurança

### Configurações Automáticas:
- Usuário de sistema dedicado sem privilégios
- Firewall configurado (UFW)
- Senhas aleatórias geradas automaticamente
- JWT com chave segura
- SSL/HTTPS opcional

### Portas Abertas:
- **80/tcp** - HTTP (sempre)
- **443/tcp** - HTTPS (se SSL habilitado)
- **22/tcp** - SSH (mantido para administração)

## 🗄️ Banco de Dados

- **PostgreSQL** instalado e configurado
- Usuário: `bgpview`
- Banco: `bgpview`
- Senha: gerada automaticamente ou definida pelo usuário

## 🌐 Nginx

### Configuração para IP:
- Serve frontend na porta 80
- Proxy para API em `/api/`
- Documentação em `/docs`

### Configuração para Domínio:
- Virtual host configurado
- SSL automático (Let's Encrypt)
- Cache para arquivos estáticos

## ⚠️ Requisitos

### Sistema Operacional:
- Debian 11+ (Bullseye)
- Ubuntu 20.04+

### Hardware Mínimo:
- **RAM**: 2GB (recomendado 4GB+)
- **Armazenamento**: 10GB livres
- **CPU**: 1 core (recomendado 2+)

### Rede:
- Acesso à internet para downloads
- Portas 80/443 liberadas (se usar domínio)

## 🛠️ Solução de Problemas

### Verificar Logs:
```bash
# Logs do instalador
journalctl -xe

# Logs do backend
journalctl -u bgpview-backend -f

# Logs do Nginx
tail -f /var/log/nginx/error.log
```

### Reinstalação:
Se algo der errado, você pode:
1. Remover o diretório `/opt/bgpview`
2. Parar os serviços: `systemctl stop bgpview-backend nginx`
3. Executar o instalador novamente

### Problemas Comuns:

**Backend não inicia:**
```bash
cd /opt/bgpview/backend
sudo -u bgpview bash -c "source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000"
```

**Erro no banco:**
```bash
sudo systemctl status postgresql
PGPASSWORD="sua_senha" psql -h localhost -U bgpview -d bgpview -c "SELECT version();"
```

**Nginx erro de configuração:**
```bash
nginx -t
systemctl reload nginx
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs mencionados acima
2. Abra uma [Issue no GitHub](https://github.com/renylson/bgpview/issues)
3. Inclua informações do sistema: `uname -a` e `lsb_release -a`

## 🔄 Atualizações

O instalador cria um sistema facilmente atualizável:
```bash
bgpview-update
```

Este comando:
- Faz backup automático
- Baixa atualizações do GitHub
- Atualiza dependências
- Executa migrações do banco
- Reinicia serviços

## 📈 Monitoramento

### Status dos Serviços:
```bash
systemctl status bgpview-backend nginx postgresql
```

### Uso de Recursos:
```bash
htop
df -h
free -h
```

### Conexões de Rede:
```bash
ss -tulpn | grep -E ':(80|443|8000|5432)'
```
