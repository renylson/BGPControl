#!/bin/bash

#################################################################
#                                                               #
#           BGPView - Instalador Automatizado                  #
#           Sistema de Gerenciamento BGP                       #
#                                                               #
#################################################################

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Variáveis globais
INSTALL_DIR="/opt/bgpview"
SERVICE_USER="bgpview"
DB_NAME="bgpview"
DB_USER="bgpview"
DOMAIN=""
USE_DOMAIN=false
USE_SSL=false
ADMIN_EMAIL=""
DB_PASSWORD=""
JWT_SECRET=""
ADMIN_USERNAME=""
ADMIN_PASSWORD=""
ADMIN_NAME=""
INSTALL_NGINX=true
INSTALL_SSL=false
CONFIG_FILE=""
NON_INTERACTIVE=false

# Função para log colorido
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "\n${PURPLE}${BOLD}========================================${NC}"
    echo -e "${PURPLE}${BOLD} $1${NC}"
    echo -e "${PURPLE}${BOLD}========================================${NC}\n"
}

# Função para gerar senha aleatória
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Função para validar email
validate_email() {
    if [[ $1 =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Função para validar domínio
validate_domain() {
    if [[ $1 =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Verificar argumentos da linha de comando
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --config)
                CONFIG_FILE="$2"
                NON_INTERACTIVE=true
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Argumento desconhecido: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Mostrar ajuda
show_help() {
    echo -e "${BOLD}BGPView Instalador - Uso:${NC}"
    echo ""
    echo "  sudo bash install.sh                    # Instalação interativa"
    echo "  sudo bash install.sh --config FILE      # Instalação não-interativa"
    echo ""
    echo -e "${BOLD}Opções:${NC}"
    echo "  --config FILE    Usar arquivo de configuração para instalação automática"
    echo "  --help, -h       Mostrar esta ajuda"
    echo ""
    echo -e "${BOLD}Exemplo:${NC}"
    echo "  sudo bash install.sh --config config.env"
    echo ""
}

# Carregar configuração do arquivo
load_config_file() {
    if [[ -n "$CONFIG_FILE" ]]; then
        if [[ ! -f "$CONFIG_FILE" ]]; then
            log_error "Arquivo de configuração não encontrado: $CONFIG_FILE"
            exit 1
        fi
        
        log_info "Carregando configuração de: $CONFIG_FILE"
        source "$CONFIG_FILE"
        
        # Validar configurações obrigatórias
        if [[ -z "$ACCESS_TYPE" ]]; then
            log_error "ACCESS_TYPE não definido no arquivo de configuração"
            exit 1
        fi
        
        if [[ -z "$ADMIN_USERNAME" || -z "$ADMIN_PASSWORD" || -z "$ADMIN_NAME" ]]; then
            log_error "Credenciais do administrador não definidas no arquivo de configuração"
            exit 1
        fi
        
        # Converter configurações
        case $ACCESS_TYPE in
            1)
                USE_DOMAIN=false
                ;;
            2)
                USE_DOMAIN=true
                if [[ -z "$DOMAIN" ]]; then
                    log_error "DOMAIN deve ser definido quando ACCESS_TYPE=2"
                    exit 1
                fi
                ;;
            *)
                log_error "ACCESS_TYPE inválido: $ACCESS_TYPE (deve ser 1 ou 2)"
                exit 1
                ;;
        esac
        
        # Gerar senhas se necessário
        if [[ -z "$DB_PASSWORD" ]]; then
            DB_PASSWORD=$(generate_password)
            log_info "Senha do banco gerada automaticamente"
        fi
        
        if [[ -z "$JWT_SECRET" ]]; then
            JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-32)
            log_info "Chave JWT gerada automaticamente"
        fi
        
        # Aplicar configurações padrão se não definidas
        DB_NAME=${DB_NAME:-"bgpview"}
        DB_USER=${DB_USER:-"bgpview"}
        INSTALL_DIR=${INSTALL_DIR:-"/opt/bgpview"}
        SERVICE_USER=${SERVICE_USER:-"bgpview"}
        INSTALL_NGINX=${INSTALL_NGINX:-true}
        SETUP_FIREWALL=${SETUP_FIREWALL:-true}
        
        log_success "Configuração carregada com sucesso"
    fi
}

# Verificar se está executando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root!"
        log_info "Execute: sudo bash install.sh"
        exit 1
    fi
}

# Verificar sistema operacional
check_os() {
    if [[ ! -f /etc/debian_version ]]; then
        log_error "Este script foi desenvolvido para Debian/Ubuntu!"
        exit 1
    fi
    
    log_success "Sistema operacional suportado detectado"
}

# Banner de boas-vindas
show_banner() {
    clear
    echo -e "${PURPLE}${BOLD}"
    cat << 'EOF'
██████╗  ██████╗ ██████╗ ██╗   ██╗██╗███████╗██╗    ██╗
██╔══██╗██╔════╝ ██╔══██╗██║   ██║██║██╔════╝██║    ██║
██████╔╝██║  ███╗██████╔╝██║   ██║██║█████╗  ██║ █╗ ██║
██╔══██╗██║   ██║██╔═══╝ ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║
██████╔╝╚██████╔╝██║      ╚████╔╝ ██║███████╗╚███╔███╔╝
╚═════╝  ╚═════╝ ╚═╝       ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ 
                                                        
        Sistema de Gerenciamento BGP - Instalador
EOF
    echo -e "${NC}\n"
    echo -e "${CYAN}Bem-vindo ao instalador automatizado do BGPView!${NC}"
    echo -e "${CYAN}Este script instalará e configurará todo o sistema.${NC}\n"
}

# Coletar informações do usuário
collect_user_input() {
    if [[ $NON_INTERACTIVE == true ]]; then
        log_info "Modo não-interativo: usando configurações do arquivo"
        return
    fi
    
    log_header "CONFIGURAÇÃO INICIAL"
    
    # Tipo de acesso
    echo -e "${BOLD}Escolha o tipo de acesso:${NC}"
    echo "1) Acesso por IP (desenvolvimento/interno)"
    echo "2) Acesso por domínio (produção)"
    echo ""
    read -p "Digite sua escolha (1-2): " access_choice
    
    case $access_choice in
        1)
            USE_DOMAIN=false
            log_info "Configurando para acesso por IP"
            ;;
        2)
            USE_DOMAIN=true
            log_info "Configurando para acesso por domínio"
            
            while true; do
                read -p "Digite seu domínio (ex: bgpview.exemplo.com): " DOMAIN
                if validate_domain "$DOMAIN"; then
                    break
                else
                    log_error "Domínio inválido! Use o formato: exemplo.com.br"
                fi
            done
            
            # Perguntar sobre SSL
            echo ""
            read -p "Deseja configurar SSL/HTTPS com Let's Encrypt? (s/n): " ssl_choice
            if [[ $ssl_choice =~ ^[SsYy]$ ]]; then
                USE_SSL=true
                INSTALL_SSL=true
                
                while true; do
                    read -p "Digite seu email para o Let's Encrypt: " ADMIN_EMAIL
                    if validate_email "$ADMIN_EMAIL"; then
                        break
                    else
                        log_error "Email inválido!"
                    fi
                done
            fi
            ;;
        *)
            log_error "Opção inválida!"
            exit 1
            ;;
    esac
    
    # Configurações do banco de dados
    echo -e "\n${BOLD}Configuração do Banco de Dados:${NC}"
    while true; do
        read -s -p "Digite a senha do banco PostgreSQL (deixe vazio para gerar automaticamente): " DB_PASSWORD
        echo ""
        if [[ -z "$DB_PASSWORD" ]]; then
            DB_PASSWORD=$(generate_password)
            log_info "Senha do banco gerada automaticamente"
            break
        elif [[ ${#DB_PASSWORD} -ge 8 ]]; then
            break
        else
            log_error "A senha deve ter pelo menos 8 caracteres!"
        fi
    done
    
    # Chave JWT
    echo -e "\n${BOLD}Configuração de Segurança:${NC}"
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-32)
    log_info "Chave JWT gerada automaticamente"
    
    # Usuário administrador
    echo -e "\n${BOLD}Usuário Administrador:${NC}"
    read -p "Nome de usuário admin: " ADMIN_USERNAME
    while [[ -z "$ADMIN_USERNAME" ]]; do
        read -p "Nome de usuário admin (obrigatório): " ADMIN_USERNAME
    done
    
    while true; do
        read -s -p "Senha do admin: " ADMIN_PASSWORD
        echo ""
        if [[ ${#ADMIN_PASSWORD} -ge 8 ]]; then
            break
        else
            log_error "A senha deve ter pelo menos 8 caracteres!"
        fi
    done
    
    read -p "Nome completo do admin: " ADMIN_NAME
    while [[ -z "$ADMIN_NAME" ]]; do
        read -p "Nome completo do admin (obrigatório): " ADMIN_NAME
    done
    
    # Confirmação
    echo -e "\n${BOLD}RESUMO DA CONFIGURAÇÃO:${NC}"
    echo "================================="
    if [[ $USE_DOMAIN == true ]]; then
        echo "• Acesso: Domínio ($DOMAIN)"
        echo "• SSL/HTTPS: $([ $USE_SSL == true ] && echo 'Sim' || echo 'Não')"
        [[ $USE_SSL == true ]] && echo "• Email Let's Encrypt: $ADMIN_EMAIL"
    else
        echo "• Acesso: IP do servidor"
    fi
    echo "• Usuário admin: $ADMIN_USERNAME"
    echo "• Nome admin: $ADMIN_NAME"
    echo "• Banco de dados: $DB_NAME"
    echo "• Usuário do banco: $DB_USER"
    echo "================================="
    echo ""
    
    read -p "Confirma a instalação com essas configurações? (s/n): " confirm
    if [[ ! $confirm =~ ^[SsYy]$ ]]; then
        log_info "Instalação cancelada pelo usuário"
        exit 0
    fi
}

# Atualizar sistema
update_system() {
    log_header "ATUALIZANDO SISTEMA"
    
    log_info "Atualizando repositórios..."
    apt update
    
    log_info "Atualizando pacotes do sistema..."
    apt upgrade -y
    
    log_info "Instalando dependências básicas..."
    apt install -y curl wget gnupg2 software-properties-common \
                   apt-transport-https ca-certificates lsb-release \
                   build-essential git htop nano unzip
    
    log_success "Sistema atualizado com sucesso"
}

# Instalar PostgreSQL
install_postgresql() {
    log_header "INSTALANDO POSTGRESQL"
    
    log_info "Instalando PostgreSQL..."
    apt install -y postgresql postgresql-contrib postgresql-client
    
    log_info "Iniciando PostgreSQL..."
    systemctl start postgresql
    systemctl enable postgresql
    
    log_info "Configurando banco de dados..."
    sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
    
    log_info "Testando conexão com o banco..."
    if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
        log_success "PostgreSQL configurado com sucesso"
    else
        log_error "Erro na configuração do PostgreSQL"
        exit 1
    fi
}

# Instalar Python 3.11
install_python() {
    log_header "INSTALANDO PYTHON 3.11"
    
    # Verificar se Python 3.11 já está disponível
    if ! command -v python3.11 &> /dev/null; then
        log_info "Adicionando repositório para Python 3.11..."
        
        # Para Debian 11, adicionar repositório backports
        if [[ $(lsb_release -rs) == "11" ]]; then
            echo "deb http://deb.debian.org/debian bullseye-backports main" >> /etc/apt/sources.list.d/backports.list
            apt update
            apt install -y -t bullseye-backports python3.11 python3.11-dev python3.11-venv
        else
            # Para Ubuntu ou versões mais novas do Debian
            add-apt-repository ppa:deadsnakes/ppa -y 2>/dev/null || {
                apt install -y python3.11 python3.11-dev python3.11-venv
            }
        fi
    fi
    
    log_info "Instalando Python 3.11 e dependências..."
    apt update
    apt install -y python3.11 python3.11-dev python3.11-venv python3-pip
    
    # Verificar instalação
    if python3.11 --version > /dev/null 2>&1; then
        log_success "Python 3.11 instalado: $(python3.11 --version)"
    else
        log_error "Erro na instalação do Python 3.11"
        exit 1
    fi
}

# Instalar Node.js
install_nodejs() {
    log_header "INSTALANDO NODE.JS"
    
    log_info "Adicionando repositório NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    
    log_info "Instalando Node.js 18.x..."
    apt install -y nodejs
    
    log_info "Atualizando npm..."
    npm install -g npm@latest
    
    # Verificar instalação
    if node --version > /dev/null 2>&1 && npm --version > /dev/null 2>&1; then
        log_success "Node.js instalado: $(node --version)"
        log_success "npm instalado: $(npm --version)"
    else
        log_error "Erro na instalação do Node.js"
        exit 1
    fi
}

# Criar usuário do sistema
create_system_user() {
    log_header "CRIANDO USUÁRIO DO SISTEMA"
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        log_info "Criando usuário $SERVICE_USER..."
        useradd --system --create-home --shell /bin/bash $SERVICE_USER
        log_success "Usuário $SERVICE_USER criado"
    else
        log_info "Usuário $SERVICE_USER já existe"
    fi
}

# Clonar projeto
clone_project() {
    log_header "CLONANDO PROJETO"
    
    log_info "Criando diretório de instalação..."
    mkdir -p $INSTALL_DIR
    
    if [[ -d "$INSTALL_DIR/.git" ]]; then
        log_info "Projeto já existe, atualizando..."
        cd $INSTALL_DIR
        git pull origin main
    else
        log_info "Clonando repositório..."
        git clone https://github.com/renylson/bgpview.git $INSTALL_DIR
    fi
    
    log_info "Ajustando permissões..."
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    
    log_success "Projeto clonado com sucesso"
}

# Configurar backend
setup_backend() {
    log_header "CONFIGURANDO BACKEND"
    
    cd $INSTALL_DIR/backend
    
    log_info "Criando ambiente virtual Python..."
    sudo -u $SERVICE_USER python3.11 -m venv .venv
    
    log_info "Instalando dependências do backend..."
    sudo -u $SERVICE_USER bash -c "
        source .venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        pip install alembic  # Garantir que Alembic está instalado
    "
    
    log_info "Criando arquivo de configuração..."
    cat > .env << EOF
# Configuração do Banco de Dados
DATABASE_URL=postgresql+asyncpg://$DB_USER:$DB_PASSWORD@localhost/$DB_NAME

# Segurança
SECRET_KEY=$JWT_SECRET
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Configurações de ambiente
DEBUG=false
LOG_LEVEL=INFO
EOF

    if [[ $USE_DOMAIN == true ]]; then
        echo "CORS_ORIGINS=https://$DOMAIN" >> .env
    else
        echo "CORS_ORIGINS=http://localhost:3000" >> .env
    fi
    
    log_info "Inicializando banco de dados..."
    
    # Primeiro, tentar usar Alembic para migrações
    log_info "Tentando executar migrações do Alembic..."
    if sudo -u $SERVICE_USER bash -c "source .venv/bin/activate && cd $INSTALL_DIR/backend && alembic upgrade head" 2>/dev/null; then
        log_success "Migrações do Alembic executadas com sucesso"
    else
        log_warning "Migrações do Alembic falharam, usando script de inicialização manual"
        
        # Usar script personalizado de inicialização
        sudo -u $SERVICE_USER bash -c "
            source .venv/bin/activate
            cd $INSTALL_DIR/backend
            python3 init_database.py '$ADMIN_USERNAME' '$ADMIN_PASSWORD' '$ADMIN_NAME' 'admin'
        "
        
        if [[ $? -eq 0 ]]; then
            log_success "Banco de dados inicializado com script personalizado"
        else
            log_error "Falha na inicialização do banco de dados"
            log_info "Tentando método de fallback..."
            
            # Fallback final
            sudo -u $SERVICE_USER bash -c "
                source .venv/bin/activate
                cd $INSTALL_DIR/backend
                python3 -c 'from app.core.init_db import init_db; import asyncio; asyncio.run(init_db())'
            "
            
            if [[ $? -eq 0 ]]; then
                log_success "Tabelas criadas com método de fallback"
            else
                log_error "Todos os métodos de inicialização do banco falharam"
                return 1
            fi
        fi
    fi
    
    # Verificar se as tabelas foram criadas
    log_info "Verificando estrutura do banco de dados..."
    if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " | grep -q "[1-9]"; then
        log_success "Tabelas do banco criadas com sucesso"
        
        # Listar tabelas criadas
        log_info "Tabelas encontradas:"
        PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
            SELECT '  • ' || tablename as tabela
            FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename;
        " 2>/dev/null || log_warning "Não foi possível listar as tabelas"
    else
        log_error "Nenhuma tabela foi criada no banco de dados"
        return 1
    fi
    
    log_success "Backend configurado com sucesso"
}

# Configurar frontend
setup_frontend() {
    log_header "CONFIGURANDO FRONTEND"
    
    cd $INSTALL_DIR/frontend
    
    log_info "Instalando dependências do frontend..."
    sudo -u $SERVICE_USER npm install
    
    log_info "Criando arquivo de configuração do frontend..."
    cat > .env << EOF
# URL da API
EOF

    if [[ $USE_DOMAIN == true ]]; then
        if [[ $USE_SSL == true ]]; then
            echo "VITE_API_URL=https://$DOMAIN/api" >> .env
        else
            echo "VITE_API_URL=http://$DOMAIN/api" >> .env
        fi
    else
        echo "VITE_API_URL=http://localhost:8000" >> .env
    fi
    
    cat >> .env << EOF

# Configurações da aplicação
VITE_APP_NAME=BGPView
VITE_APP_VERSION=1.0.0
EOF
    
    log_info "Fazendo build do frontend..."
    sudo -u $SERVICE_USER npm run build
    
    log_success "Frontend configurado com sucesso"
}

# Configurar serviço systemd
setup_systemd() {
    log_header "CONFIGURANDO SERVIÇO SYSTEMD"
    
    log_info "Criando serviço bgpview-backend..."
    cat > /etc/systemd/system/bgpview-backend.service << EOF
[Unit]
Description=BGPView Backend API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=exec
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR/backend
Environment=PATH=$INSTALL_DIR/backend/.venv/bin
EnvironmentFile=$INSTALL_DIR/backend/.env
ExecStart=$INSTALL_DIR/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    log_info "Habilitando e iniciando serviço..."
    systemctl daemon-reload
    systemctl enable bgpview-backend
    systemctl start bgpview-backend
    
    # Aguardar alguns segundos para o serviço iniciar
    sleep 5
    
    if systemctl is-active --quiet bgpview-backend; then
        log_success "Serviço bgpview-backend iniciado com sucesso"
    else
        log_error "Erro ao iniciar o serviço bgpview-backend"
        systemctl status bgpview-backend
        exit 1
    fi
}

# Instalar e configurar Nginx
setup_nginx() {
    log_header "CONFIGURANDO NGINX"
    
    log_info "Instalando Nginx..."
    apt install -y nginx
    
    log_info "Criando configuração do site..."
    
    if [[ $USE_DOMAIN == true ]]; then
        # Configuração para domínio
        cat > /etc/nginx/sites-available/bgpview << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend estático
    location / {
        root $INSTALL_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Documentação da API
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Arquivos estáticos com cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root $INSTALL_DIR/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    else
        # Configuração para IP
        cat > /etc/nginx/sites-available/bgpview << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    # Frontend estático
    location / {
        root $INSTALL_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Documentação da API
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Arquivos estáticos com cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root $INSTALL_DIR/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    fi
    
    log_info "Habilitando site..."
    ln -sf /etc/nginx/sites-available/bgpview /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    log_info "Testando configuração do Nginx..."
    if nginx -t; then
        log_info "Reiniciando Nginx..."
        systemctl restart nginx
        systemctl enable nginx
        log_success "Nginx configurado com sucesso"
    else
        log_error "Erro na configuração do Nginx"
        exit 1
    fi
}

# Configurar SSL com Let's Encrypt
setup_ssl() {
    if [[ $INSTALL_SSL == true && $USE_DOMAIN == true ]]; then
        log_header "CONFIGURANDO SSL/HTTPS"
        
        log_info "Instalando Certbot..."
        apt install -y certbot python3-certbot-nginx
        
        log_info "Obtendo certificado SSL para $DOMAIN..."
        certbot --nginx -d $DOMAIN --email $ADMIN_EMAIL --agree-tos --non-interactive
        
        log_info "Configurando renovação automática..."
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        
        log_success "SSL configurado com sucesso"
    fi
}

# Criar usuário administrador
create_admin_user() {
    log_header "VERIFICANDO USUÁRIO ADMINISTRADOR"
    
    log_info "Aguardando backend inicializar..."
    sleep 10
    
    # Testar se a API está respondendo
    local api_url="http://localhost:8000"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$api_url/docs" > /dev/null 2>&1; then
            log_success "Backend está respondendo"
            break
        fi
        
        log_info "Tentativa $attempt/$max_attempts - Aguardando backend..."
        sleep 2
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_warning "Backend não respondeu, mas usuário pode ter sido criado durante inicialização do banco"
        log_info "Verifique manualmente após a instalação"
        return 0
    fi
    
    # Verificar se usuário já existe
    log_info "Verificando se usuário administrador já existe..."
    
    local check_response=$(curl -s -X POST "http://localhost:8000/users/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"$ADMIN_USERNAME\",
            \"password\": \"$ADMIN_PASSWORD\",
            \"name\": \"$ADMIN_NAME\",
            \"profile\": \"admin\"
        }" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        if echo "$check_response" | grep -q "já existe\|already exists"; then
            log_success "Usuário administrador já existe no sistema"
        else
            log_success "Usuário administrador criado via API"
        fi
    else
        log_warning "Não foi possível criar/verificar usuário via API"
        log_info "O usuário pode ter sido criado durante a inicialização do banco"
        log_info "Credenciais configuradas: $ADMIN_USERNAME / $ADMIN_PASSWORD"
    fi
}

# Configurar firewall
setup_firewall() {
    log_header "CONFIGURANDO FIREWALL"
    
    if command -v ufw &> /dev/null; then
        log_info "Configurando UFW..."
        ufw --force enable
        ufw allow ssh
        ufw allow 80/tcp
        
        if [[ $USE_SSL == true ]]; then
            ufw allow 443/tcp
        fi
        
        log_success "Firewall configurado"
    else
        log_info "UFW não encontrado, instalando..."
        apt install -y ufw
        setup_firewall
    fi
}

# Criar scripts de manutenção
create_maintenance_scripts() {
    log_header "CRIANDO SCRIPTS DE MANUTENÇÃO"
    
    mkdir -p /usr/local/bin/bgpview
    
    # Script de backup
    cat > /usr/local/bin/bgpview/backup.sh << EOF
#!/bin/bash
# Script de backup do BGPView

BACKUP_DIR="/var/backups/bgpview"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Backup do banco de dados
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U $DB_USER $DB_NAME > \$BACKUP_DIR/database_\$DATE.sql

# Backup dos arquivos de configuração
tar -czf \$BACKUP_DIR/config_\$DATE.tar.gz $INSTALL_DIR/backend/.env $INSTALL_DIR/frontend/.env

# Manter apenas os últimos 7 backups
find \$BACKUP_DIR -name "*.sql" -mtime +7 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup concluído: \$DATE"
EOF

    # Script de atualização
    cat > /usr/local/bin/bgpview/update.sh << EOF
#!/bin/bash
# Script de atualização do BGPView

cd $INSTALL_DIR

echo "Fazendo backup antes da atualização..."
/usr/local/bin/bgpview/backup.sh

echo "Parando serviços..."
systemctl stop bgpview-backend

echo "Atualizando código..."
sudo -u $SERVICE_USER git pull origin main

echo "Atualizando backend..."
cd backend
sudo -u $SERVICE_USER bash -c "source .venv/bin/activate && pip install -r requirements.txt"
sudo -u $SERVICE_USER bash -c "source .venv/bin/activate && alembic upgrade head"

echo "Atualizando frontend..."
cd ../frontend
sudo -u $SERVICE_USER npm install
sudo -u $SERVICE_USER npm run build

echo "Reiniciando serviços..."
systemctl start bgpview-backend
systemctl reload nginx

echo "Atualização concluída!"
EOF

    # Script de status
    cat > /usr/local/bin/bgpview/status.sh << EOF
#!/bin/bash
# Script de status do BGPView

echo "=== Status dos Serviços BGPView ==="
echo ""

echo "Backend:"
systemctl status bgpview-backend --no-pager -l

echo ""
echo "Nginx:"
systemctl status nginx --no-pager -l

echo ""
echo "PostgreSQL:"
systemctl status postgresql --no-pager -l

echo ""
echo "=== Banco de Dados ==="
if sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) as usuarios FROM users;" 2>/dev/null; then
    echo "Conexão com banco: OK"
    sudo -u postgres psql -d $DB_NAME -c "
        SELECT 'Usuários: ' || COUNT(*) FROM users
        UNION ALL
        SELECT 'Roteadores: ' || COUNT(*) FROM routers
        UNION ALL  
        SELECT 'Peerings: ' || COUNT(*) FROM peerings
        UNION ALL
        SELECT 'Grupos: ' || COUNT(*) FROM peering_groups;
    " 2>/dev/null || echo "Erro ao consultar dados"
else
    echo "Erro na conexão com banco de dados"
fi

echo ""
echo "=== Uso de Recursos ==="
echo "Memória:"
free -h

echo ""
echo "Disco:"
df -h $INSTALL_DIR

echo ""
echo "=== Conexões Ativas ==="
ss -tulpn | grep -E ':(80|443|8000|5432)'
EOF

    # Script de verificação do banco
    cat > /usr/local/bin/bgpview/check-db.sh << EOF
#!/bin/bash
# Script de verificação do banco de dados

echo "=== Verificação do Banco de Dados BGPView ==="
echo ""

# Verificar conexão
echo "Testando conexão..."
if sudo -u postgres psql -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Conexão OK"
else
    echo "❌ Erro na conexão"
    exit 1
fi

# Verificar tabelas
echo ""
echo "Verificando tabelas..."
expected_tables=("users" "routers" "peerings" "peering_groups" "peering_group_association")
missing=0

for table in "\${expected_tables[@]}"; do
    if sudo -u postgres psql -d $DB_NAME -t -c "SELECT to_regclass('public.\$table');" 2>/dev/null | grep -q "\$table"; then
        echo "✅ Tabela '\$table' existe"
    else
        echo "❌ Tabela '\$table' não encontrada"
        ((missing++))
    fi
done

if [[ \$missing -eq 0 ]]; then
    echo ""
    echo "✅ Todas as tabelas necessárias estão presentes"
    
    # Mostrar contadores
    echo ""
    echo "Dados nas tabelas:"
    sudo -u postgres psql -d $DB_NAME -c "
        SELECT 'Usuários: ' || COUNT(*) FROM users
        UNION ALL
        SELECT 'Roteadores: ' || COUNT(*) FROM routers  
        UNION ALL
        SELECT 'Peerings: ' || COUNT(*) FROM peerings
        UNION ALL
        SELECT 'Grupos: ' || COUNT(*) FROM peering_groups;
    " 2>/dev/null
else
    echo ""
    echo "❌ \$missing tabela(s) faltando - execute: bgpview-repair-db"
fi
EOF

    # Script de reparo do banco
    cat > /usr/local/bin/bgpview/repair-db.sh << EOF
#!/bin/bash
# Script de reparo do banco de dados

echo "=== Reparo do Banco de Dados BGPView ==="
echo ""

read -p "Deseja tentar reparar o banco de dados? (s/N): " confirm
if [[ ! \$confirm =~ ^[SsYy]\$ ]]; then
    echo "Reparo cancelado"
    exit 0
fi

echo "Iniciando reparo..."

# Tentar Alembic primeiro
echo "Tentando Alembic..."
if sudo -u $SERVICE_USER bash -c "source $INSTALL_DIR/backend/.venv/bin/activate && cd $INSTALL_DIR/backend && alembic upgrade head" 2>/dev/null; then
    echo "✅ Alembic executado com sucesso"
else
    echo "⚠️  Alembic falhou, tentando script personalizado..."
    
    if [[ -f "$INSTALL_DIR/backend/init_database.py" ]]; then
        sudo -u $SERVICE_USER bash -c "
            source $INSTALL_DIR/backend/.venv/bin/activate
            cd $INSTALL_DIR/backend  
            python3 init_database.py
        "
        
        if [[ \$? -eq 0 ]]; then
            echo "✅ Script personalizado executado"
        else
            echo "❌ Falha no reparo"
            exit 1
        fi
    else
        echo "❌ Script de reparo não encontrado"
        exit 1
    fi
fi

echo ""
echo "Verificando resultado..."
/usr/local/bin/bgpview/check-db.sh
EOF

    # Tornar scripts executáveis
    chmod +x /usr/local/bin/bgpview/*.sh
    
    # Criar link simbólico para fácil acesso
    ln -sf /usr/local/bin/bgpview/status.sh /usr/local/bin/bgpview-status
    ln -sf /usr/local/bin/bgpview/backup.sh /usr/local/bin/bgpview-backup
    ln -sf /usr/local/bin/bgpview/update.sh /usr/local/bin/bgpview-update
    ln -sf /usr/local/bin/bgpview/check-db.sh /usr/local/bin/bgpview-check-db
    ln -sf /usr/local/bin/bgpview/repair-db.sh /usr/local/bin/bgpview-repair-db
    
    log_success "Scripts de manutenção criados"
}

# Mostrar informações finais
show_completion_info() {
    log_header "INSTALAÇÃO CONCLUÍDA"
    
    local server_ip=$(hostname -I | awk '{print $1}')
    
    echo -e "${GREEN}${BOLD}🎉 BGPView instalado com sucesso!${NC}\n"
    
    echo -e "${BOLD}📋 INFORMAÇÕES DE ACESSO:${NC}"
    echo "================================="
    
    if [[ $USE_DOMAIN == true ]]; then
        if [[ $USE_SSL == true ]]; then
            echo -e "• ${BOLD}URL do Sistema:${NC} https://$DOMAIN"
            echo -e "• ${BOLD}API Docs:${NC} https://$DOMAIN/docs"
        else
            echo -e "• ${BOLD}URL do Sistema:${NC} http://$DOMAIN"
            echo -e "• ${BOLD}API Docs:${NC} http://$DOMAIN/docs"
        fi
    else
        echo -e "• ${BOLD}URL do Sistema:${NC} http://$server_ip"
        echo -e "• ${BOLD}API Docs:${NC} http://$server_ip/docs"
    fi
    
    echo ""
    echo -e "${BOLD}👤 CREDENCIAIS DO ADMINISTRADOR:${NC}"
    echo "================================="
    echo -e "• ${BOLD}Usuário:${NC} $ADMIN_USERNAME"
    echo -e "• ${BOLD}Senha:${NC} $ADMIN_PASSWORD"
    echo -e "• ${BOLD}Nome:${NC} $ADMIN_NAME"
    
    echo ""
    echo -e "${BOLD}🗄️ INFORMAÇÕES DO BANCO:${NC}"
    echo "================================="
    echo -e "• ${BOLD}Banco:${NC} $DB_NAME"
    echo -e "• ${BOLD}Usuário:${NC} $DB_USER"
    echo -e "• ${BOLD}Senha:${NC} $DB_PASSWORD"
    
    echo ""
    echo -e "${BOLD}🔧 COMANDOS ÚTEIS:${NC}"
    echo "================================="
    echo -e "• ${CYAN}bgpview-status${NC}       - Ver status dos serviços"
    echo -e "• ${CYAN}bgpview-backup${NC}       - Fazer backup do sistema"
    echo -e "• ${CYAN}bgpview-update${NC}       - Atualizar o sistema"
    echo -e "• ${CYAN}bgpview-check-db${NC}     - Verificar banco de dados"
    echo -e "• ${CYAN}bgpview-repair-db${NC}    - Reparar banco de dados"
    echo ""
    echo -e "• ${CYAN}systemctl status bgpview-backend${NC} - Status do backend"
    echo -e "• ${CYAN}journalctl -u bgpview-backend -f${NC} - Logs do backend"
    echo -e "• ${CYAN}systemctl restart bgpview-backend${NC} - Reiniciar backend"
    
    echo ""
    echo -e "${BOLD}📁 DIRETÓRIOS IMPORTANTES:${NC}"
    echo "================================="
    echo -e "• ${BOLD}Instalação:${NC} $INSTALL_DIR"
    echo -e "• ${BOLD}Logs Backend:${NC} journalctl -u bgpview-backend"
    echo -e "• ${BOLD}Logs Nginx:${NC} /var/log/nginx/"
    echo -e "• ${BOLD}Backups:${NC} /var/backups/bgpview/"
    
    echo ""
    echo -e "${YELLOW}${BOLD}⚠️  IMPORTANTE:${NC}"
    echo "• Anote as credenciais do administrador em local seguro"
    echo "• Configure backups regulares com: bgpview-backup"
    echo "• Para atualizações, use: bgpview-update"
    
    if [[ $USE_DOMAIN == true && $USE_SSL == false ]]; then
        echo "• Configure SSL/HTTPS para produção"
    fi
    
    echo ""
    echo -e "${PURPLE}${BOLD}📚 DOCUMENTAÇÃO:${NC}"
    echo "• README: $INSTALL_DIR/README.md"
    echo "• API Docs: Acesse /docs na URL do sistema"
    
    echo ""
    echo -e "${GREEN}${BOLD}✅ Sistema pronto para uso!${NC}"
}

# Função principal
main() {
    parse_arguments "$@"
    show_banner
    check_root
    check_os
    load_config_file
    collect_user_input
    
    log_info "Iniciando instalação..."
    
    update_system
    install_postgresql
    install_python
    install_nodejs
    create_system_user
    clone_project
    setup_backend
    setup_frontend
    setup_systemd
    setup_nginx
    setup_ssl
    create_admin_user
    setup_firewall
    create_maintenance_scripts
    
    show_completion_info
    
    log_success "Instalação concluída com sucesso!"
}

# Tratamento de erros
trap 'log_error "Erro durante a instalação na linha $LINENO. Verifique os logs."; exit 1' ERR

# Executar instalação
main "$@"
