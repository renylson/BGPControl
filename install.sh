#!/bin/bash

#################################################################
#                                                               #
#           BGPControl - Instalador Automatizado                  #
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
INSTALL_DIR="/opt/bgpcontrol"
SERVICE_USER="bgpcontrol"
DB_NAME="bgpcontrol"
DB_USER="bgpcontrol"
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

# Função para executar comandos com o usuário correto
run_as_user() {
    local user="$1"
    shift
    if [[ $EUID -eq 0 ]]; then
        if id "$user" &>/dev/null; then
            sudo -u "$user" "$@"
        else
            # Se o usuário não existe ainda, execute como root
            "$@"
        fi
    else
        "$@"
    fi
}

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
    echo -e "${BOLD}BGPControl Instalador - Uso:${NC}"
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
        DB_NAME=${DB_NAME:-"bgpcontrol"}
        DB_USER=${DB_USER:-"bgpcontrol"}
        INSTALL_DIR=${INSTALL_DIR:-"/opt/bgpcontrol"}
        SERVICE_USER=${SERVICE_USER:-"bgpcontrol"}
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
██████╗  ██████╗ ██████╗  ██████╗ ██████╗ ███╗   ██╗████████╗██████╗  ██████╗ ██╗     
██╔══██╗██╔════╝ ██╔══██╗██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗██╔═══██╗██║     
██████╔╝██║  ███╗██████╔╝██║     ██║   ██║██╔██╗ ██║   ██║   ██████╔╝██║   ██║██║     
██╔══██╗██║   ██║██╔═══╝ ██║     ██║   ██║██║╚██╗██║   ██║   ██╔══██╗██║   ██║██║     
██████╔╝╚██████╔╝██║     ╚██████╗╚██████╔╝██║ ╚████║   ██║   ██║  ██║╚██████╔╝███████╗
╚═════╝  ╚═════╝ ╚═╝      ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
                                                        
        Sistema de Gerenciamento BGP - Instalador
EOF
    echo -e "${NC}\n"
    echo -e "${CYAN}Bem-vindo ao instalador automatizado do BGPControl!${NC}"
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
                read -p "Digite seu domínio (ex: bgpcontrol.exemplo.com): " DOMAIN
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
    
    # Criar usuário se não existir
    if ! run_as_user postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        run_as_user postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
        log_success "Usuário $DB_USER criado"
    else
        log_info "Usuário $DB_USER já existe"
    fi
    
    # Criar banco se não existir
    if ! run_as_user postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        run_as_user postgres createdb -O "$DB_USER" "$DB_NAME"
        log_success "Banco $DB_NAME criado"
    else
        log_info "Banco $DB_NAME já existe"
    fi
    
    # Configurar permissões
    run_as_user postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    run_as_user postgres psql -c "ALTER USER $DB_USER CREATEDB;"
    
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
    
    log_info "Corrigindo versão do npm..."
    # Forçar instalação de uma versão compatível do npm
    npm install -g npm@9.9.3 --force
    
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
    run_as_user $SERVICE_USER python3.11 -m venv .venv
    
    log_info "Instalando dependências do backend..."
    run_as_user $SERVICE_USER bash -c "
        source .venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        pip install alembic  # Garantir que Alembic está instalado
    "
    
    log_info "Criando arquivo de configuração..."
    # URL-encode da senha para evitar problemas com caracteres especiais
    DB_PASSWORD_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$DB_PASSWORD', safe=''))")
    
    cat > .env << EOF
# Configuração do Banco de Dados
DATABASE_URL=postgresql+asyncpg://$DB_USER:$DB_PASSWORD_ENCODED@localhost/$DB_NAME

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
    
    # Primeiro, tentar usar script personalizado de inicialização
    log_info "Executando script de inicialização do banco..."
    
    if run_as_user $SERVICE_USER bash -c "
        source .venv/bin/activate
        cd $INSTALL_DIR/backend
        python3 init_database.py '$ADMIN_USERNAME' '$ADMIN_PASSWORD' '$ADMIN_NAME' 'admin'
    "; then
        log_success "Banco de dados inicializado com sucesso"
    else
        log_warning "Script personalizado falhou, tentando Alembic..."
        
        # Tentar Alembic como fallback
        if run_as_user $SERVICE_USER bash -c "source .venv/bin/activate && cd $INSTALL_DIR/backend && alembic upgrade head" 2>/dev/null; then
            log_success "Migrações do Alembic executadas com sucesso"
            
            # Criar usuário admin após migrações
            log_info "Criando usuário administrador..."
            run_as_user $SERVICE_USER bash -c "
                source .venv/bin/activate
                cd $INSTALL_DIR/backend
                python3 create_admin.py '$ADMIN_USERNAME' '$ADMIN_PASSWORD' '$ADMIN_NAME' 'Administrador'
            "
        else
            log_error "Falha na inicialização do banco de dados"
            log_info "Tentando método de fallback direto..."
            
            # Fallback final - criar tabelas diretamente
            run_as_user $SERVICE_USER bash -c "
                source .venv/bin/activate
                cd $INSTALL_DIR/backend
                python3 -c '
import asyncio
from app.core.config import engine
from app.models.user import Base
from app.models.router import Router
from app.models.peering import Peering
from app.models.peering_group import PeeringGroup

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(\"Tabelas criadas com sucesso\")

asyncio.run(create_tables())
'
            "
            
            if [[ $? -eq 0 ]]; then
                log_success "Tabelas criadas com método de fallback"
                
                # Criar usuário admin
                log_info "Criando usuário administrador..."
                run_as_user $SERVICE_USER bash -c "
                    source .venv/bin/activate
                    cd $INSTALL_DIR/backend
                    python3 -c '
import asyncio
from app.core.config import engine
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

async def create_admin():
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as session:
        admin_user = User(
            username=\"$ADMIN_USERNAME\",
            hashed_password=get_password_hash(\"$ADMIN_PASSWORD\"),
            name=\"$ADMIN_NAME\",
            profile=\"admin\",
            is_active=True
        )
        session.add(admin_user)
        await session.commit()
        print(\"Usuário administrador criado\")

asyncio.run(create_admin())
'
                "
            else
                log_error "Todos os métodos de inicialização do banco falharam"
                return 1
            fi
        fi
    fi
    
    # Verificar se as tabelas foram criadas
    log_info "Verificando estrutura do banco de dados..."
    
    # Lista de tabelas esperadas com suas colunas principais
    expected_tables=(
        "users:id,username,hashed_password,name,profile,is_active"
        "routers:id,name,ip,ssh_port,ssh_user,ssh_password,asn,note,is_active,ip_origens"
        "peerings:id,name,ip,type,remote_asn,remote_asn_name,note,router_id,ip_origem_id,is_active"
        "peering_groups:id,name,description,router_id,is_active"
        "peering_group_association:group_id,peering_id"
    )
    
    missing_tables=()
    
    for table_info in "${expected_tables[@]}"; do
        table_name=$(echo "$table_info" | cut -d':' -f1)
        columns=$(echo "$table_info" | cut -d':' -f2)
        
        # Verificar se a tabela existe
        if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '$table_name'
            );
        " 2>/dev/null | grep -q "t"; then
            log_success "Tabela '$table_name' existe"
            
            # Verificar colunas principais
            missing_columns=()
            IFS=',' read -ra COLS <<< "$columns"
            for col in "${COLS[@]}"; do
                if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = '$table_name' 
                        AND column_name = '$col'
                    );
                " 2>/dev/null | grep -q "t"; then
                    missing_columns+=("$col")
                fi
            done
            
            if [ ${#missing_columns[@]} -eq 0 ]; then
                log_success "Colunas da tabela '$table_name' estão corretas"
            else
                log_warning "Colunas faltando na tabela '$table_name': ${missing_columns[*]}"
            fi
        else
            log_error "Tabela '$table_name' não encontrada"
            missing_tables+=("$table_name")
        fi
    done
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        log_success "Todas as tabelas necessárias foram criadas"
        
        # Mostrar resumo das tabelas criadas
        log_info "Tabelas criadas no banco de dados:"
        PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
            SELECT 
                '  • ' || schemaname || '.' || tablename || ' (' || 
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_schema = schemaname AND table_name = tablename) || ' colunas)'
            FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename;
        " 2>/dev/null || log_warning "Não foi possível listar as tabelas"
        
        # Verificar se há dados iniciais
        log_info "Verificando dados iniciais..."
        if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
            SELECT COUNT(*) FROM users WHERE username = '$ADMIN_USERNAME';
        " 2>/dev/null | grep -q "1"; then
            log_success "Usuário administrador criado com sucesso"
        else
            log_warning "Usuário administrador não encontrado no banco"
        fi
    else
        log_error "Tabelas faltando: ${missing_tables[*]}"
        log_error "Verifique os logs para mais detalhes"
        return 1
    fi
    
    log_success "Backend configurado com sucesso"
}

# Configurar frontend
setup_frontend() {
    log_header "CONFIGURANDO FRONTEND"
    
    cd $INSTALL_DIR/frontend
    
    log_info "Instalando dependências do frontend..."
    run_as_user $SERVICE_USER npm install
    
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
        # Para acesso por IP, usar caminho relativo para funcionar com nginx proxy
        echo "VITE_API_URL=/api" >> .env
    fi
    
    cat >> .env << EOF

# Configurações da aplicação
VITE_APP_NAME=BGPControl
VITE_APP_VERSION=1.0.0
EOF
    
    log_info "Fazendo build do frontend..."
    run_as_user $SERVICE_USER npm run build
    
    log_success "Frontend configurado com sucesso"
}

# Configurar serviço systemd
setup_systemd() {
    log_header "CONFIGURANDO SERVIÇO SYSTEMD"
    
    log_info "Criando serviço bgpcontrol-backend..."
    cat > /etc/systemd/system/bgpcontrol-backend.service << EOF
[Unit]
Description=BGPControl Backend API
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
    systemctl enable bgpcontrol-backend
    systemctl start bgpcontrol-backend
    
    # Aguardar alguns segundos para o serviço iniciar
    sleep 5
    
    if systemctl is-active --quiet bgpcontrol-backend; then
        log_success "Serviço bgpcontrol-backend iniciado com sucesso"
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
    
    # IMPORTANTE: O proxy_pass deve incluir /api/ no final para
    # preservar o prefixo que o backend espera
    # Corrigido bug onde proxy_pass era http://127.0.0.1:8000/
    # que removia o prefixo /api/ causando erro 404 no login
    
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
    location = /api {
        return 301 /api/;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers para CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization";
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain charset=UTF-8';
            add_header Content-Length 0;
            return 204;
        }
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
    
    # Logs
    access_log /var/log/nginx/bgpview_access.log;
    error_log /var/log/nginx/bgpview_error.log;
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
    location = /api {
        return 301 /api/;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers para CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization";
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain charset=UTF-8';
            add_header Content-Length 0;
            return 204;
        }
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
    
    # Logs
    access_log /var/log/nginx/bgpview_access.log;
    error_log /var/log/nginx/bgpview_error.log;
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

echo "=== Atualização do BGPView ==="
echo ""

cd $INSTALL_DIR

echo "Verificando estado atual..."
if ! systemctl is-active --quiet bgpview-backend; then
    echo "⚠️  Serviço backend não está rodando"
    read -p "Deseja continuar mesmo assim? (s/N): " confirm
    if [[ ! \$confirm =~ ^[SsYy]\$ ]]; then
        echo "Atualização cancelada"
        exit 0
    fi
fi

echo "Fazendo backup antes da atualização..."
/usr/local/bin/bgpview/backup.sh

echo "Parando serviços..."
systemctl stop bgpview-backend

echo "Salvando configurações atuais..."
cp $INSTALL_DIR/backend/.env /tmp/bgpview_env_backup_\$(date +%Y%m%d_%H%M%S)
cp $INSTALL_DIR/frontend/.env /tmp/bgpview_frontend_env_backup_\$(date +%Y%m%d_%H%M%S)

echo "Atualizando código..."
if sudo -u $SERVICE_USER git pull origin main; then
    echo "✅ Código atualizado"
else
    echo "⚠️  Erro ao atualizar código, continuando..."
fi

echo "Atualizando backend..."
cd $INSTALL_DIR/backend

# Instalar/atualizar dependências
echo "Instalando dependências..."
if sudo -u $SERVICE_USER bash -c "source .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"; then
    echo "✅ Dependências atualizadas"
else
    echo "❌ Erro ao atualizar dependências"
    exit 1
fi

# Executar migrações
echo "Executando migrações do banco..."
if sudo -u $SERVICE_USER bash -c "source .venv/bin/activate && alembic upgrade head" 2>/dev/null; then
    echo "✅ Migrações aplicadas"
else
    echo "⚠️  Migrações falharam, tentando script de inicialização..."
    
    if sudo -u $SERVICE_USER bash -c "source .venv/bin/activate && python3 init_database.py"; then
        echo "✅ Script de inicialização executado"
    else
        echo "❌ Erro nas migrações"
        echo "Verifique o banco de dados manualmente"
    fi
fi

echo "Atualizando frontend..."
cd $INSTALL_DIR/frontend

# Instalar/atualizar dependências
echo "Instalando dependências do frontend..."
if sudo -u $SERVICE_USER npm install; then
    echo "✅ Dependências do frontend atualizadas"
else
    echo "❌ Erro ao atualizar dependências do frontend"
    exit 1
fi

# Fazer build
echo "Fazendo build do frontend..."
if sudo -u $SERVICE_USER npm run build; then
    echo "✅ Build do frontend concluído"
else
    echo "❌ Erro no build do frontend"
    exit 1
fi

echo "Reiniciando serviços..."
systemctl start bgpview-backend
systemctl reload nginx

# Aguardar alguns segundos
sleep 5

# Verificar se os serviços estão funcionando
echo "Verificando serviços..."
if systemctl is-active --quiet bgpview-backend; then
    echo "✅ Serviço backend OK"
else
    echo "❌ Erro no serviço backend"
    echo "Verifique: systemctl status bgpview-backend"
fi

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx OK"
else
    echo "❌ Erro no Nginx"
    echo "Verifique: systemctl status nginx"
fi

echo ""
echo "Verificando banco de dados..."
/usr/local/bin/bgpview/check-db.sh

echo ""
echo "=== Atualização Concluída ==="
echo "Verifique se o sistema está funcionando normalmente"
echo "Logs do backend: journalctl -u bgpview-backend -f"
EOF

    # Script de status
    cat > /usr/local/bin/bgpview/status.sh << EOF
#!/bin/bash
# Script de status do BGPView

echo "=== Status do Sistema BGPView ==="
echo ""

# Informações do sistema
echo "📋 INFORMAÇÕES DO SISTEMA:"
echo "Data/Hora: \$(date)"
echo "Uptime: \$(uptime -p)"
echo "Usuário BGPView: $SERVICE_USER"
echo "Diretório: $INSTALL_DIR"
echo ""

# Status dos serviços
echo "🔧 STATUS DOS SERVIÇOS:"
echo "========================"

echo "Backend (bgpview-backend):"
if systemctl is-active --quiet bgpview-backend; then
    echo "✅ Ativo"
    echo "   PID: \$(systemctl show bgpview-backend -p MainPID --value)"
    echo "   Desde: \$(systemctl show bgpview-backend -p ActiveEnterTimestamp --value | cut -d' ' -f2-3)"
else
    echo "❌ Inativo"
fi

echo ""
echo "Nginx:"
if systemctl is-active --quiet nginx; then
    echo "✅ Ativo"
    echo "   PID: \$(systemctl show nginx -p MainPID --value)"
else
    echo "❌ Inativo"
fi

echo ""
echo "PostgreSQL:"
if systemctl is-active --quiet postgresql; then
    echo "✅ Ativo"
    echo "   PID: \$(systemctl show postgresql -p MainPID --value)"
else
    echo "❌ Inativo"
fi

# Status da API
echo ""
echo "🌐 STATUS DA API:"
echo "=================="
api_url="http://localhost:8000"
if curl -f -s "\$api_url/docs" > /dev/null 2>&1; then
    echo "✅ API respondendo"
    echo "   URL: \$api_url"
    
    # Tentar obter versão se disponível
    if curl -f -s "\$api_url/health" > /dev/null 2>&1; then
        echo "   Health check: OK"
    fi
else
    echo "❌ API não está respondendo"
fi

# Status do banco de dados
echo ""
echo "🗄️ STATUS DO BANCO DE DADOS:"
echo "============================"
if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Conexão OK"
    echo "   Banco: $DB_NAME"
    echo "   Usuário: $DB_USER"
    
    # Contar registros
    echo ""
    echo "   Dados nas tabelas:"
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT 
            '   • Usuários: ' || COUNT(*) FROM users
        UNION ALL
        SELECT 
            '   • Roteadores: ' || COUNT(*) FROM routers  
        UNION ALL
        SELECT 
            '   • Peerings: ' || COUNT(*) FROM peerings
        UNION ALL
        SELECT 
            '   • Grupos: ' || COUNT(*) FROM peering_groups
        UNION ALL
        SELECT 
            '   • Associações: ' || COUNT(*) FROM peering_group_association;
    " 2>/dev/null | sed 's/^[ \t]*//'
else
    echo "❌ Erro na conexão com banco de dados"
fi

# Uso de recursos
echo ""
echo "📊 USO DE RECURSOS:"
echo "==================="
echo "Memória:"
free -h | grep -E "(Mem|Swap):" | while read line; do
    echo "   \$line"
done

echo ""
echo "Disco (diretório de instalação):"
df -h $INSTALL_DIR | tail -1 | while read line; do
    echo "   \$line"
done

# Conexões de rede
echo ""
echo "🌐 CONEXÕES DE REDE:"
echo "===================="
echo "Portas em uso:"
ss -tulpn | grep -E ':(80|443|8000|5432)' | while read line; do
    echo "   \$line"
done

# Logs recentes
echo ""
echo "📜 LOGS RECENTES (últimas 5 linhas):"
echo "===================================="
echo "Backend:"
journalctl -u bgpview-backend -n 5 --no-pager | tail -5 | while read line; do
    echo "   \$line"
done

echo ""
echo "Nginx (access):"
if [[ -f /var/log/nginx/bgpview_access.log ]]; then
    tail -3 /var/log/nginx/bgpview_access.log | while read line; do
        echo "   \$line"
    done
else
    echo "   (log não encontrado)"
fi

echo ""
echo "=== Status verificado em \$(date) ==="
echo "Para logs detalhados: journalctl -u bgpview-backend -f"
EOF

    # Script de verificação do banco
    cat > /usr/local/bin/bgpview/check-db.sh << EOF
#!/bin/bash
# Script de verificação do banco de dados

echo "=== Verificação do Banco de Dados BGPView ==="
echo ""

# Verificar conexão
echo "Testando conexão..."
if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Conexão OK"
else
    echo "❌ Erro na conexão"
    exit 1
fi

# Verificar tabelas e suas estruturas
echo ""
echo "Verificando tabelas..."
expected_tables=(
    "users:id,username,hashed_password,name,profile,is_active"
    "routers:id,name,ip,ssh_port,ssh_user,ssh_password,asn,note,is_active,ip_origens"
    "peerings:id,name,ip,type,remote_asn,remote_asn_name,note,router_id,ip_origem_id,is_active"
    "peering_groups:id,name,description,router_id,is_active"
    "peering_group_association:group_id,peering_id"
)

missing=0
for table_info in "\${expected_tables[@]}"; do
    table_name=\$(echo "\$table_info" | cut -d':' -f1)
    columns=\$(echo "\$table_info" | cut -d':' -f2)
    
    # Verificar se a tabela existe
    if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '\$table_name'
        );
    " 2>/dev/null | grep -q "t"; then
        echo "✅ Tabela '\$table_name' existe"
        
        # Verificar colunas principais
        missing_columns=()
        IFS=',' read -ra COLS <<< "\$columns"
        for col in "\${COLS[@]}"; do
            if ! PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = '\$table_name' 
                    AND column_name = '\$col'
                );
            " 2>/dev/null | grep -q "t"; then
                missing_columns+=("\$col")
            fi
        done
        
        if [ \${#missing_columns[@]} -eq 0 ]; then
            echo "   ✅ Colunas OK"
        else
            echo "   ⚠️  Colunas faltando: \${missing_columns[*]}"
        fi
    else
        echo "❌ Tabela '\$table_name' não encontrada"
        ((missing++))
    fi
done

if [[ \$missing -eq 0 ]]; then
    echo ""
    echo "✅ Todas as tabelas necessárias estão presentes"
    
    # Mostrar contadores
    echo ""
    echo "Dados nas tabelas:"
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -c "
        SELECT 
            'Usuários: ' || COUNT(*) as info FROM users
        UNION ALL
        SELECT 
            'Roteadores: ' || COUNT(*) FROM routers  
        UNION ALL
        SELECT 
            'Peerings: ' || COUNT(*) FROM peerings
        UNION ALL
        SELECT 
            'Grupos de Peering: ' || COUNT(*) FROM peering_groups
        UNION ALL
        SELECT 
            'Associações: ' || COUNT(*) FROM peering_group_association;
    " 2>/dev/null
    
    # Verificar usuário admin
    echo ""
    echo "Verificando usuário administrador..."
    admin_count=\$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM users WHERE profile = 'admin';
    " 2>/dev/null | xargs)
    
    if [[ \$admin_count -gt 0 ]]; then
        echo "✅ Usuário(s) administrador(es) encontrado(s): \$admin_count"
    else
        echo "⚠️  Nenhum usuário administrador encontrado"
    fi
else
    echo ""
    echo "❌ \$missing tabela(s) faltando - execute: bgpview-repair-db"
fi

echo ""
echo "=== Verificação de Integridade ==="
# Verificar chaves estrangeiras
echo "Verificando referências..."
broken_refs=0

# Verificar peerings -> routers
broken_peerings=\$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM peerings p 
    LEFT JOIN routers r ON p.router_id = r.id 
    WHERE r.id IS NULL;
" 2>/dev/null | xargs)

if [[ \$broken_peerings -gt 0 ]]; then
    echo "❌ Peerings com referências quebradas: \$broken_peerings"
    ((broken_refs++))
else
    echo "✅ Referências peerings->routers OK"
fi

# Verificar peering_group_association -> peering_groups e peerings
broken_associations=\$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM peering_group_association pga
    LEFT JOIN peering_groups pg ON pga.group_id = pg.id
    LEFT JOIN peerings p ON pga.peering_id = p.id
    WHERE pg.id IS NULL OR p.id IS NULL;
" 2>/dev/null | xargs)

if [[ \$broken_associations -gt 0 ]]; then
    echo "❌ Associações com referências quebradas: \$broken_associations"
    ((broken_refs++))
else
    echo "✅ Referências associações OK"
fi

if [[ \$broken_refs -eq 0 ]]; then
    echo ""
    echo "✅ Integridade referencial OK"
else
    echo ""
    echo "⚠️  Problemas de integridade encontrados: \$broken_refs"
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

# Parar serviço durante reparo
echo "Parando serviço backend..."
systemctl stop bgpview-backend

# Fazer backup antes do reparo
echo "Fazendo backup de segurança..."
backup_file="/tmp/bgpview_backup_\$(date +%Y%m%d_%H%M%S).sql"
if PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U $DB_USER $DB_NAME > "\$backup_file" 2>/dev/null; then
    echo "✅ Backup criado: \$backup_file"
else
    echo "⚠️  Erro no backup, continuando..."
fi

# Tentar script de inicialização primeiro
echo "Tentando script de inicialização..."
if sudo -u $SERVICE_USER bash -c "
    source $INSTALL_DIR/backend/.venv/bin/activate
    cd $INSTALL_DIR/backend  
    python3 init_database.py
" 2>/dev/null; then
    echo "✅ Script de inicialização executado com sucesso"
else
    echo "⚠️  Script de inicialização falhou, tentando Alembic..."
    
    # Tentar Alembic
    if sudo -u $SERVICE_USER bash -c "
        source $INSTALL_DIR/backend/.venv/bin/activate 
        cd $INSTALL_DIR/backend 
        alembic upgrade head
    " 2>/dev/null; then
        echo "✅ Alembic executado com sucesso"
    else
        echo "⚠️  Alembic falhou, tentando criação manual..."
        
        # Criar tabelas manualmente
        if sudo -u $SERVICE_USER bash -c "
            source $INSTALL_DIR/backend/.venv/bin/activate
            cd $INSTALL_DIR/backend
            python3 -c '
import asyncio
from app.core.config import engine
from app.models.user import Base
from app.models.router import Router
from app.models.peering import Peering
from app.models.peering_group import PeeringGroup

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(\"Tabelas criadas\")

asyncio.run(create_tables())
'
        " 2>/dev/null; then
            echo "✅ Tabelas criadas manualmente"
        else
            echo "❌ Falha na criação manual das tabelas"
            echo "Restaurando serviço..."
            systemctl start bgpview-backend
            exit 1
        fi
    fi
fi

# Verificar se precisamos criar usuário admin
echo ""
echo "Verificando usuário administrador..."
admin_exists=\$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM users WHERE profile = 'admin';
" 2>/dev/null | xargs)

if [[ \$admin_exists -eq 0 ]]; then
    echo "Criando usuário administrador padrão..."
    
    # Tentar criar usuário padrão
    if sudo -u $SERVICE_USER bash -c "
        source $INSTALL_DIR/backend/.venv/bin/activate
        cd $INSTALL_DIR/backend
        python3 create_admin.py admin admin123 'Administrador' admin
    " 2>/dev/null; then
        echo "✅ Usuário administrador criado"
        echo "   Username: admin"
        echo "   Password: admin123"
        echo "   ⚠️  ALTERE A SENHA PADRÃO!"
    else
        echo "⚠️  Não foi possível criar usuário administrador"
        echo "   Crie manualmente após o reparo"
    fi
else
    echo "✅ Usuário administrador já existe"
fi

# Reiniciar serviço
echo ""
echo "Reiniciando serviço backend..."
systemctl start bgpview-backend

# Aguardar alguns segundos
sleep 5

# Verificar se o serviço está funcionando
if systemctl is-active --quiet bgpview-backend; then
    echo "✅ Serviço backend reiniciado com sucesso"
else
    echo "❌ Erro ao reiniciar serviço backend"
    echo "Verifique: systemctl status bgpview-backend"
fi

echo ""
echo "Verificando resultado do reparo..."
/usr/local/bin/bgpview/check-db.sh

echo ""
echo "=== Reparo Concluído ==="
echo "Backup de segurança: \$backup_file"
echo "Mantenha o backup até confirmar que tudo está funcionando"
EOF

    # Script de teste da instalação
    cat > /usr/local/bin/bgpview/test-install.sh << EOF
#!/bin/bash
# Script para testar a instalação do BGPView

echo "=== Teste da Instalação BGPView ==="
echo ""

# Função para testar componente
test_component() {
    local component="\$1"
    local test_command="\$2"
    local description="\$3"
    
    echo -n "Testando \$component... "
    
    if eval "\$test_command" > /dev/null 2>&1; then
        echo "✅ OK"
        return 0
    else
        echo "❌ FALHA"
        echo "   Erro: \$description"
        return 1
    fi
}

# Contador de testes
total_tests=0
passed_tests=0

# Teste 1: Serviços systemd
echo "🔧 TESTANDO SERVIÇOS:"
((total_tests++))
if test_component "Backend Service" "systemctl is-active --quiet bgpview-backend" "Serviço bgpview-backend não está ativo"; then
    ((passed_tests++))
fi

((total_tests++))
if test_component "Nginx Service" "systemctl is-active --quiet nginx" "Serviço nginx não está ativo"; then
    ((passed_tests++))
fi

((total_tests++))
if test_component "PostgreSQL Service" "systemctl is-active --quiet postgresql" "Serviço postgresql não está ativo"; then
    ((passed_tests++))
fi

echo ""
echo "🗄️ TESTANDO BANCO DE DADOS:"
((total_tests++))
if test_component "Database Connection" "PGPASSWORD='$DB_PASSWORD' psql -h localhost -U $DB_USER -d $DB_NAME -c 'SELECT 1'" "Não conseguiu conectar ao banco"; then
    ((passed_tests++))
fi

# Teste das tabelas
tables=("users" "routers" "peerings" "peering_groups" "peering_group_association")
for table in "\${tables[@]}"; do
    ((total_tests++))
    if test_component "Table \$table" "PGPASSWORD='$DB_PASSWORD' psql -h localhost -U $DB_USER -d $DB_NAME -t -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '\$table');\" | grep -q 't'" "Tabela \$table não existe"; then
        ((passed_tests++))
    fi
done

echo ""
echo "🌐 TESTANDO API:"
((total_tests++))
if test_component "API Health" "curl -f -s http://localhost:8000/docs" "API não está respondendo"; then
    ((passed_tests++))
fi

((total_tests++))
if test_component "API Documentation" "curl -f -s http://localhost:8000/openapi.json" "Documentação da API não está disponível"; then
    ((passed_tests++))
fi

echo ""
echo "📁 TESTANDO ARQUIVOS:"
((total_tests++))
if test_component "Backend Environment" "test -f $INSTALL_DIR/backend/.env" "Arquivo .env do backend não existe"; then
    ((passed_tests++))
fi

((total_tests++))
if test_component "Frontend Build" "test -d $INSTALL_DIR/frontend/dist" "Build do frontend não existe"; then
    ((passed_tests++))
fi

((total_tests++))
if test_component "Frontend Environment" "test -f $INSTALL_DIR/frontend/.env" "Arquivo .env do frontend não existe"; then
    ((passed_tests++))
fi

echo ""
echo "🐍 TESTANDO PYTHON ENVIRONMENT:"
((total_tests++))
if test_component "Python Virtual Environment" "test -f $INSTALL_DIR/backend/.venv/bin/activate" "Ambiente virtual Python não existe"; then
    ((passed_tests++))
fi

((total_tests++))
if test_component "Python Dependencies" "sudo -u $SERVICE_USER bash -c 'source $INSTALL_DIR/backend/.venv/bin/activate && python -c \"import fastapi, sqlalchemy, asyncpg\"'" "Dependências Python não instaladas"; then
    ((passed_tests++))
fi

echo ""
echo "📦 TESTANDO NODE.JS:"
((total_tests++))
if test_component "Node.js" "node --version" "Node.js não está instalado"; then
    ((passed_tests++))
fi

((total_tests++))
if test_component "npm" "npm --version" "npm não está instalado"; then
    ((passed_tests++))
fi

echo ""
echo "🔐 TESTANDO USUÁRIO ADMINISTRADOR:"
((total_tests++))
admin_count=\$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE profile = 'admin';" 2>/dev/null | xargs)
if [[ \$admin_count -gt 0 ]]; then
    echo "Usuário administrador... ✅ OK"
    ((passed_tests++))
else
    echo "Usuário administrador... ❌ FALHA"
    echo "   Erro: Nenhum usuário administrador encontrado"
fi

echo ""
echo "📊 RESULTADO DOS TESTES:"
echo "========================="
echo "Total de testes: \$total_tests"
echo "Testes aprovados: \$passed_tests"
echo "Testes falharam: \$((total_tests - passed_tests))"

if [[ \$passed_tests -eq \$total_tests ]]; then
    echo ""
    echo "🎉 TODOS OS TESTES PASSARAM!"
    echo "✅ Instalação está funcionando corretamente"
    exit 0
else
    echo ""
    echo "⚠️  ALGUNS TESTES FALHARAM"
    echo "❌ Verifique os erros acima e execute bgpview-repair-db se necessário"
    exit 1
fi
EOF
    
    # Tornar scripts executáveis
    chmod +x /usr/local/bin/bgpview/*.sh
    
    # Criar links simbólicos para fácil acesso
    ln -sf /usr/local/bin/bgpview/status.sh /usr/local/bin/bgpview-status
    ln -sf /usr/local/bin/bgpview/backup.sh /usr/local/bin/bgpview-backup
    ln -sf /usr/local/bin/bgpview/update.sh /usr/local/bin/bgpview-update
    ln -sf /usr/local/bin/bgpview/check-db.sh /usr/local/bin/bgpview-check-db
    ln -sf /usr/local/bin/bgpview/repair-db.sh /usr/local/bin/bgpview-repair-db
    ln -sf /usr/local/bin/bgpview/test-install.sh /usr/local/bin/bgpview-test
    
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
    echo -e "• ${CYAN}bgpview-test${NC}         - Testar instalação"
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
    
    # Executar teste da instalação
    log_header "VERIFICAÇÃO FINAL"
    log_info "Executando teste da instalação..."
    
    if /usr/local/bin/bgpview/test-install.sh; then
        log_success "Todos os testes passaram!"
    else
        log_warning "Alguns testes falharam - verifique os detalhes acima"
        log_info "Execute 'bgpview-repair-db' se necessário"
    fi
    
    show_completion_info
    
    log_success "Instalação concluída com sucesso!"
}

# Tratamento de erros
trap 'log_error "Erro durante a instalação na linha $LINENO. Verifique os logs."; exit 1' ERR

# Executar instalação
main "$@"
