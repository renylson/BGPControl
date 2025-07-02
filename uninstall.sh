#!/bin/bash

#################################################################
#                                                               #
#           BGPView - Script de Desinstalação                  #
#           Remove completamente o sistema                     #
#                                                               #
#################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Variáveis
INSTALL_DIR="/opt/bgpview"
SERVICE_USER="bgpview"
DB_NAME="bgpview"
DB_USER="bgpview"

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

# Banner
show_banner() {
    clear
    echo -e "${RED}${BOLD}"
    cat << 'EOF'
██████╗  ██████╗ ██████╗ ██╗   ██╗██╗███████╗██╗    ██╗
██╔══██╗██╔════╝ ██╔══██╗██║   ██║██║██╔════╝██║    ██║
██████╔╝██║  ███╗██████╔╝██║   ██║██║█████╗  ██║ █╗ ██║
██╔══██╗██║   ██║██╔═══╝ ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║
██████╔╝╚██████╔╝██║      ╚████╔╝ ██║███████╗╚███╔███╔╝
╚═════╝  ╚═════╝ ╚═╝       ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ 
                                                        
              SCRIPT DE DESINSTALAÇÃO
EOF
    echo -e "${NC}\n"
    echo -e "${RED}Este script removerá completamente o BGPView do sistema!${NC}\n"
}

# Verificar se está executando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root!"
        log_info "Execute: sudo bash uninstall.sh"
        exit 1
    fi
}

# Confirmação do usuário
confirm_uninstall() {
    echo -e "${BOLD}O que será removido:${NC}"
    echo "• Aplicação BGPView ($INSTALL_DIR)"
    echo "• Serviço systemd (bgpview-backend)"
    echo "• Configuração do Nginx"
    echo "• Usuário do sistema ($SERVICE_USER)"
    echo "• Scripts de manutenção"
    echo ""
    echo -e "${YELLOW}${BOLD}ATENÇÃO:${NC} ${YELLOW}O banco de dados PostgreSQL NÃO será removido${NC}"
    echo -e "${YELLOW}Para remover também o banco, execute manualmente:${NC}"
    echo -e "${YELLOW}  sudo -u postgres dropdb $DB_NAME${NC}"
    echo -e "${YELLOW}  sudo -u postgres dropuser $DB_USER${NC}"
    echo ""
    
    read -p "Tem certeza que deseja continuar? (s/N): " confirm
    if [[ ! $confirm =~ ^[SsYy]$ ]]; then
        log_info "Desinstalação cancelada pelo usuário"
        exit 0
    fi
    
    echo ""
    read -p "Digite 'REMOVER' para confirmar: " confirm_word
    if [[ "$confirm_word" != "REMOVER" ]]; then
        log_info "Confirmação incorreta. Desinstalação cancelada."
        exit 0
    fi
}

# Parar serviços
stop_services() {
    log_header "PARANDO SERVIÇOS"
    
    # Parar backend
    if systemctl is-active --quiet bgpview-backend; then
        log_info "Parando serviço bgpview-backend..."
        systemctl stop bgpview-backend
    fi
    
    # Desabilitar serviço
    if systemctl is-enabled --quiet bgpview-backend 2>/dev/null; then
        log_info "Desabilitando serviço bgpview-backend..."
        systemctl disable bgpview-backend
    fi
    
    log_success "Serviços parados"
}

# Remover arquivos systemd
remove_systemd() {
    log_header "REMOVENDO CONFIGURAÇÕES SYSTEMD"
    
    if [[ -f /etc/systemd/system/bgpview-backend.service ]]; then
        log_info "Removendo arquivo de serviço..."
        rm -f /etc/systemd/system/bgpview-backend.service
        systemctl daemon-reload
        log_success "Arquivo de serviço removido"
    else
        log_info "Arquivo de serviço não encontrado"
    fi
}

# Remover configuração do Nginx
remove_nginx_config() {
    log_header "REMOVENDO CONFIGURAÇÃO NGINX"
    
    # Remover link simbólico
    if [[ -L /etc/nginx/sites-enabled/bgpview ]]; then
        log_info "Removendo site habilitado..."
        rm -f /etc/nginx/sites-enabled/bgpview
    fi
    
    # Remover arquivo de configuração
    if [[ -f /etc/nginx/sites-available/bgpview ]]; then
        log_info "Removendo arquivo de configuração..."
        rm -f /etc/nginx/sites-available/bgpview
    fi
    
    # Testar configuração do Nginx
    if nginx -t 2>/dev/null; then
        log_info "Recarregando Nginx..."
        systemctl reload nginx
        log_success "Configuração do Nginx removida"
    else
        log_warning "Erro na configuração do Nginx após remoção"
    fi
}

# Remover diretório da aplicação
remove_application() {
    log_header "REMOVENDO APLICAÇÃO"
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_info "Removendo diretório $INSTALL_DIR..."
        rm -rf "$INSTALL_DIR"
        log_success "Diretório da aplicação removido"
    else
        log_info "Diretório da aplicação não encontrado"
    fi
}

# Remover usuário do sistema
remove_user() {
    log_header "REMOVENDO USUÁRIO DO SISTEMA"
    
    if id "$SERVICE_USER" &>/dev/null; then
        log_info "Removendo usuário $SERVICE_USER..."
        userdel -r "$SERVICE_USER" 2>/dev/null || {
            # Se falhar ao remover o home, tentar sem -r
            userdel "$SERVICE_USER" 2>/dev/null || log_warning "Não foi possível remover o usuário $SERVICE_USER"
        }
        log_success "Usuário $SERVICE_USER removido"
    else
        log_info "Usuário $SERVICE_USER não encontrado"
    fi
}

# Remover scripts de manutenção
remove_scripts() {
    log_header "REMOVENDO SCRIPTS DE MANUTENÇÃO"
    
    # Remover diretório de scripts
    if [[ -d /usr/local/bin/bgpview ]]; then
        log_info "Removendo scripts de manutenção..."
        rm -rf /usr/local/bin/bgpview
    fi
    
    # Remover links simbólicos
    local scripts=("bgpview-status" "bgpview-backup" "bgpview-update")
    for script in "${scripts[@]}"; do
        if [[ -L "/usr/local/bin/$script" ]]; then
            log_info "Removendo link $script..."
            rm -f "/usr/local/bin/$script"
        fi
    done
    
    log_success "Scripts de manutenção removidos"
}

# Remover certificados SSL (opcional)
remove_ssl() {
    log_header "VERIFICANDO CERTIFICADOS SSL"
    
    if command -v certbot &> /dev/null; then
        log_info "Listando certificados Let's Encrypt..."
        local certs=$(certbot certificates 2>/dev/null | grep "Certificate Name:" | awk '{print $3}' || true)
        
        if [[ -n "$certs" ]]; then
            echo -e "${YELLOW}Certificados encontrados:${NC}"
            echo "$certs"
            echo ""
            read -p "Deseja remover os certificados SSL? (s/N): " remove_certs
            
            if [[ $remove_certs =~ ^[SsYy]$ ]]; then
                echo "$certs" | while read -r cert; do
                    if [[ -n "$cert" ]]; then
                        log_info "Removendo certificado $cert..."
                        certbot delete --cert-name "$cert" --non-interactive
                    fi
                done
                log_success "Certificados SSL removidos"
            else
                log_info "Certificados SSL mantidos"
            fi
        else
            log_info "Nenhum certificado Let's Encrypt encontrado"
        fi
    else
        log_info "Certbot não encontrado"
    fi
}

# Limpar backups (opcional)
cleanup_backups() {
    log_header "LIMPANDO BACKUPS"
    
    if [[ -d /var/backups/bgpview ]]; then
        echo -e "${YELLOW}Diretório de backups encontrado: /var/backups/bgpview${NC}"
        read -p "Deseja remover os backups? (s/N): " remove_backups
        
        if [[ $remove_backups =~ ^[SsYy]$ ]]; then
            log_info "Removendo backups..."
            rm -rf /var/backups/bgpview
            log_success "Backups removidos"
        else
            log_info "Backups mantidos em /var/backups/bgpview"
        fi
    else
        log_info "Nenhum backup encontrado"
    fi
}

# Informações finais
show_completion() {
    log_header "DESINSTALAÇÃO CONCLUÍDA"
    
    echo -e "${GREEN}${BOLD}✅ BGPView removido com sucesso!${NC}\n"
    
    echo -e "${BOLD}📋 O QUE FOI REMOVIDO:${NC}"
    echo "• Aplicação BGPView"
    echo "• Serviço systemd"
    echo "• Configuração do Nginx"
    echo "• Usuário do sistema"
    echo "• Scripts de manutenção"
    
    echo -e "\n${BOLD}📋 O QUE NÃO FOI REMOVIDO:${NC}"
    echo "• PostgreSQL (banco de dados)"
    echo "• Nginx (apenas a configuração do BGPView)"
    echo "• Python, Node.js e outras dependências"
    
    echo -e "\n${BOLD}🗄️ PARA REMOVER O BANCO MANUALMENTE:${NC}"
    echo "sudo -u postgres dropdb $DB_NAME"
    echo "sudo -u postgres dropuser $DB_USER"
    
    echo -e "\n${BOLD}🔧 PARA REMOVER DEPENDÊNCIAS (OPCIONAL):${NC}"
    echo "sudo apt remove --purge nodejs postgresql postgresql-contrib nginx"
    echo "sudo apt autoremove"
    
    echo -e "\n${GREEN}${BOLD}🎉 Sistema limpo!${NC}"
}

# Função principal
main() {
    show_banner
    check_root
    confirm_uninstall
    
    log_info "Iniciando desinstalação..."
    
    stop_services
    remove_systemd
    remove_nginx_config
    remove_application
    remove_user
    remove_scripts
    remove_ssl
    cleanup_backups
    
    show_completion
}

# Tratamento de erros
trap 'log_error "Erro durante a desinstalação na linha $LINENO"; exit 1' ERR

# Executar desinstalação
main "$@"
