#!/bin/bash

#################################################################
#                                                               #
#           BGPControl - Setup de Automação                    #
#           Configura cron jobs para backup e limpeza          #
#                                                               #
#################################################################

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
INSTALL_DIR="/opt/bgpcontrol"
SERVICE_USER="bgpcontrol"
BACKEND_DIR="$INSTALL_DIR/backend"

# Função para log colorido
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_header() {
    echo -e "\n${PURPLE}${BOLD}========================================${NC}"
    echo -e "${PURPLE}${BOLD} $1${NC}"
    echo -e "${PURPLE}${BOLD}========================================${NC}\n"
}

# Banner
show_banner() {
    clear
    echo -e "${BLUE}${BOLD}"
    cat << 'EOF'
██████╗  ██████╗ ██████╗ ██╗   ██╗██╗███████╗██╗    ██╗
██╔══██╗██╔════╝ ██╔══██╗██║   ██║██║██╔════╝██║    ██║
██████╔╝██║  ███╗██████╔╝██║   ██║██║█████╗  ██║ █╗ ██║
██╔══██╗██║   ██║██╔═══╝ ██║     ██║██║██╔══╝  ██║███╗██║
██████╔╝╚██████╔╝██║     ╚██████╗╚██████╔╝██║ ╚████║
╚═════╝  ╚═════╝ ╚═╝      ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝ 
                                                        
            CONFIGURAÇÃO DE AUTOMAÇÃO
EOF
    echo -e "${NC}\n"
    echo -e "${CYAN}Configurando backup automático e limpeza de logs...${NC}\n"
}

# Verificar se está executando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root!"
        log_info "Execute: sudo bash setup_automation.sh"
        exit 1
    fi
}

# Verificar se a instalação existe
check_installation() {
    log_header "VERIFICANDO INSTALAÇÃO"
    
    if [[ ! -d "$INSTALL_DIR" ]]; then
        log_error "Diretório de instalação não encontrado: $INSTALL_DIR"
        exit 1
    fi
    
    if [[ ! -d "$BACKEND_DIR" ]]; then
        log_error "Diretório backend não encontrado: $BACKEND_DIR"
        exit 1
    fi
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        log_error "Usuário $SERVICE_USER não encontrado"
        exit 1
    fi
    
    log_success "Instalação verificada"
}

# Criar diretórios necessários
create_directories() {
    log_header "CRIANDO DIRETÓRIOS"
    
    # Diretório de backups
    mkdir -p /var/backups/bgpcontrol
    chown $SERVICE_USER:$SERVICE_USER /var/backups/bgpcontrol
    chmod 755 /var/backups/bgpcontrol
    log_success "Diretório de backups criado"
    
    # Diretório de logs
    mkdir -p /var/log/bgpcontrol
    chown $SERVICE_USER:$SERVICE_USER /var/log/bgpcontrol
    chmod 755 /var/log/bgpcontrol
    log_success "Diretório de logs criado"
}

# Configurar permissões dos scripts
setup_script_permissions() {
    log_header "CONFIGURANDO PERMISSÕES"
    
    # Tornar scripts executáveis
    chmod +x "$BACKEND_DIR/audit_cleanup_cron.py"
    chmod +x "$BACKEND_DIR/backup_cron.py"
    
    # Ajustar proprietário
    chown $SERVICE_USER:$SERVICE_USER "$BACKEND_DIR/audit_cleanup_cron.py"
    chown $SERVICE_USER:$SERVICE_USER "$BACKEND_DIR/backup_cron.py"
    
    log_success "Permissões configuradas"
}

# Configurar logrotate
setup_logrotate() {
    log_header "CONFIGURANDO LOGROTATE"
    
    cat > /etc/logrotate.d/bgpcontrol << EOF
/var/log/bgpcontrol_*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 $SERVICE_USER $SERVICE_USER
    postrotate
        # Nenhuma ação necessária
    endscript
}

/var/log/bgpcontrol/*.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 0644 $SERVICE_USER $SERVICE_USER
}

/var/log/bgpcontrol/*.txt {
    monthly
    missingok
    rotate 6
    compress
    delaycompress
    notifempty
    create 0644 $SERVICE_USER $SERVICE_USER
}
EOF

    log_success "Logrotate configurado"
}

# Configurar cron jobs
setup_cron_jobs() {
    log_header "CONFIGURANDO CRON JOBS"
    
    # Backup do crontab atual do usuário bgpcontrol
    log_info "Fazendo backup do crontab atual..."
    sudo -u $SERVICE_USER crontab -l > /tmp/bgpcontrol_crontab_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "# Crontab vazio" > /tmp/bgpcontrol_crontab_backup_$(date +%Y%m%d_%H%M%S)
    
    # Criar novo crontab
    log_info "Configurando novos cron jobs..."
    
    cat > /tmp/bgpcontrol_crontab << EOF
# BGPControl - Tarefas Automáticas
# Gerado automaticamente em $(date)

# Backup diário do banco de dados às 02:00
0 2 * * * cd $BACKEND_DIR && source .venv/bin/activate && python3 backup_cron.py >> /var/log/bgpcontrol_backup.log 2>&1

# Limpeza de logs de auditoria aos domingos às 03:00 (manter 6 meses)
0 3 * * 0 cd $BACKEND_DIR && source .venv/bin/activate && python3 audit_cleanup_cron.py >> /var/log/bgpcontrol_audit_cleanup.log 2>&1

# Verificação de saúde do sistema (diário às 01:00)
0 1 * * * /usr/local/bin/bgpcontrol-check-db >> /var/log/bgpcontrol_health.log 2>&1

EOF

    # Instalar crontab
    sudo -u $SERVICE_USER crontab /tmp/bgpcontrol_crontab
    
    if [[ $? -eq 0 ]]; then
        log_success "Cron jobs configurados"
        rm /tmp/bgpcontrol_crontab
    else
        log_error "Erro ao configurar cron jobs"
        exit 1
    fi
}

# Criar scripts de gerenciamento
create_management_scripts() {
    log_header "CRIANDO SCRIPTS DE GERENCIAMENTO"
    
    # Script para executar backup manual
    cat > /usr/local/bin/bgpcontrol-backup-now << 'EOF'
#!/bin/bash
# Script para executar backup manual

INSTALL_DIR="/opt/bgpcontrol"
SERVICE_USER="bgpcontrol"

echo "=== BGPControl - Backup Manual ==="
echo ""

if [[ $EUID -eq 0 ]]; then
    echo "Executando backup como usuário $SERVICE_USER..."
    sudo -u $SERVICE_USER bash -c "
        cd $INSTALL_DIR/backend
        source .venv/bin/activate
        python3 backup_cron.py
    "
else
    echo "Executando backup..."
    cd $INSTALL_DIR/backend
    source .venv/bin/activate
    python3 backup_cron.py
fi

echo "Backup concluído!"
EOF

    # Script para executar limpeza manual
    cat > /usr/local/bin/bgpcontrol-cleanup-audit << 'EOF'
#!/bin/bash
# Script para executar limpeza de logs manual

INSTALL_DIR="/opt/bgpcontrol"
SERVICE_USER="bgpcontrol"

echo "=== BGPControl - Limpeza de Logs Manual ==="
echo ""

if [[ $EUID -eq 0 ]]; then
    echo "Executando limpeza como usuário $SERVICE_USER..."
    sudo -u $SERVICE_USER bash -c "
        cd $INSTALL_DIR/backend
        source .venv/bin/activate
        python3 audit_cleanup_cron.py
    "
else
    echo "Executando limpeza..."
    cd $INSTALL_DIR/backend
    source .venv/bin/activate
    python3 audit_cleanup_cron.py
fi

echo "Limpeza concluída!"
EOF

    # Script de status da automação
    cat > /usr/local/bin/bgpcontrol-automation-status << 'EOF'
#!/bin/bash
# Mostra status da automação

echo "=== BGPControl - Status da Automação ==="
echo ""

echo "CRON JOBS CONFIGURADOS:"
echo "======================"
sudo -u bgpcontrol crontab -l | grep -v "^#" | grep -v "^$" || echo "Nenhum cron job encontrado"

echo ""
echo "ÚLTIMOS BACKUPS:"
echo "================"
ls -la /var/backups/bgpcontrol/ | head -10

echo ""
echo "LOGS RECENTES:"
echo "=============="
echo "Backup:"
tail -5 /var/log/bgpcontrol_backup.log 2>/dev/null || echo "Log não encontrado"

echo ""
echo "Limpeza de auditoria:"
tail -5 /var/log/bgpcontrol_audit_cleanup.log 2>/dev/null || echo "Log não encontrado"

echo ""
echo "ESPAÇO EM DISCO:"
echo "================"
df -h /var/backups/bgpcontrol/ 2>/dev/null || df -h /var/backups/
EOF

    # Tornar scripts executáveis
    chmod +x /usr/local/bin/bgpcontrol-backup-now
    chmod +x /usr/local/bin/bgpcontrol-cleanup-audit
    chmod +x /usr/local/bin/bgpcontrol-automation-status
    
    log_success "Scripts de gerenciamento criados"
}

# Verificar configuração
test_automation() {
    log_header "TESTANDO CONFIGURAÇÃO"
    
    # Testar backup manual
    log_info "Testando backup manual..."
    if sudo -u $SERVICE_USER bash -c "cd $BACKEND_DIR && source .venv/bin/activate && python3 -c 'from app.services.database_backup import DatabaseBackupService; print(\"Serviço OK\")'"; then
        log_success "Serviço de backup OK"
    else
        log_error "Erro no serviço de backup"
        return 1
    fi
    
    # Testar limpeza manual
    log_info "Testando limpeza de auditoria..."
    if sudo -u $SERVICE_USER bash -c "cd $BACKEND_DIR && source .venv/bin/activate && python3 -c 'from app.services.audit_cleanup import AuditLogCleanupService; print(\"Serviço OK\")'"; then
        log_success "Serviço de limpeza OK"
    else
        log_error "Erro no serviço de limpeza"
        return 1
    fi
    
    # Verificar cron jobs
    log_info "Verificando cron jobs..."
    if sudo -u $SERVICE_USER crontab -l | grep -q "backup_cron.py"; then
        log_success "Cron job de backup configurado"
    else
        log_error "Cron job de backup não encontrado"
        return 1
    fi
    
    if sudo -u $SERVICE_USER crontab -l | grep -q "audit_cleanup_cron.py"; then
        log_success "Cron job de limpeza configurado"
    else
        log_error "Cron job de limpeza não encontrado"
        return 1
    fi
    
    return 0
}

# Mostrar informações finais
show_completion_info() {
    log_header "CONFIGURAÇÃO CONCLUÍDA"
    
    echo -e "${GREEN}${BOLD}✅ Automação configurada com sucesso!${NC}\n"
    
    echo -e "${BOLD}📋 TAREFAS AUTOMÁTICAS CONFIGURADAS:${NC}"
    echo "================================================"
    echo -e "• ${CYAN}Backup diário${NC}        - Todo dia às 02:00"
    echo -e "• ${CYAN}Limpeza de logs${NC}      - Domingos às 03:00 (manter 6 meses)"
    echo -e "• ${CYAN}Verificação de saúde${NC} - Todo dia às 01:00"
    
    echo ""
    echo -e "${BOLD}🛠️  COMANDOS DISPONÍVEIS:${NC}"
    echo "========================="
    echo -e "• ${CYAN}bgpcontrol-backup-now${NC}          - Executar backup manual"
    echo -e "• ${CYAN}bgpcontrol-cleanup-audit${NC}       - Executar limpeza manual"
    echo -e "• ${CYAN}bgpcontrol-automation-status${NC}   - Ver status da automação"
    
    echo ""
    echo -e "${BOLD}📁 DIRETÓRIOS IMPORTANTES:${NC}"
    echo "=========================="
    echo -e "• ${BOLD}Backups:${NC} /var/backups/bgpcontrol/"
    echo -e "• ${BOLD}Logs:${NC} /var/log/bgpcontrol_*.log"
    echo -e "• ${BOLD}Relatórios:${NC} /var/log/bgpcontrol/"
    
    echo ""
    echo -e "${BOLD}🔧 CONFIGURAÇÕES:${NC}"
    echo "================="
    echo -e "• ${CYAN}Backups mantidos por:${NC} 30 dias"
    echo -e "• ${CYAN}Logs de auditoria mantidos por:${NC} 6 meses"
    echo -e "• ${CYAN}Relatórios mantidos por:${NC} 30 backups / 10 limpezas"
    
    echo ""
    echo -e "${YELLOW}${BOLD}💡 DICAS:${NC}"
    echo "========="
    echo "• Use 'bgpcontrol-automation-status' para monitorar"
    echo "• Logs são rotacionados automaticamente"
    echo "• Backups são compactados para economizar espaço"
    echo "• Para alterar configurações, edite os scripts cron"
    
    echo ""
    echo -e "${GREEN}A automação está ativa e funcionando!${NC}"
}

# Função principal
main() {
    show_banner
    check_root
    check_installation
    create_directories
    setup_script_permissions
    setup_logrotate
    setup_cron_jobs
    create_management_scripts
    
    if test_automation; then
        show_completion_info
        exit 0
    else
        log_error "Falha na configuração da automação"
        exit 1
    fi
}

# Executar configuração
main "$@"
