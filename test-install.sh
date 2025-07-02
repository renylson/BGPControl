#!/bin/bash

#################################################################
#                                                               #
#           BGPView - Script de Teste da Instalação            #
#           Valida se o sistema está funcionando               #
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
INSTALL_DIR="/opt/bgpview"
SERVICE_USER="bgpview"
DB_NAME="bgpview"
DB_USER="bgpview"
TESTS_PASSED=0
TESTS_FAILED=0

# Função para log colorido
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
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
██╔══██╗██║   ██║██╔═══╝ ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║
██████╔╝╚██████╔╝██║      ╚████╔╝ ██║███████╗╚███╔███╔╝
╚═════╝  ╚═════╝ ╚═╝       ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ 
                                                        
            TESTE DA INSTALAÇÃO
EOF
    echo -e "${NC}\n"
    echo -e "${CYAN}Validando a instalação do BGPView...${NC}\n"
}

# Testar arquivos de instalação
test_installation_files() {
    log_header "VERIFICANDO ARQUIVOS DE INSTALAÇÃO"
    
    # Diretório principal
    if [[ -d "$INSTALL_DIR" ]]; then
        log_success "Diretório de instalação existe: $INSTALL_DIR"
    else
        log_error "Diretório de instalação não encontrado: $INSTALL_DIR"
        return
    fi
    
    # Backend
    if [[ -d "$INSTALL_DIR/backend" ]]; then
        log_success "Diretório backend existe"
    else
        log_error "Diretório backend não encontrado"
    fi
    
    # Frontend
    if [[ -d "$INSTALL_DIR/frontend" ]]; then
        log_success "Diretório frontend existe"
    else
        log_error "Diretório frontend não encontrado"
    fi
    
    # Frontend build
    if [[ -d "$INSTALL_DIR/frontend/dist" ]]; then
        log_success "Build do frontend existe"
    else
        log_error "Build do frontend não encontrado"
    fi
    
    # Ambiente virtual Python
    if [[ -d "$INSTALL_DIR/backend/.venv" ]]; then
        log_success "Ambiente virtual Python existe"
    else
        log_error "Ambiente virtual Python não encontrado"
    fi
    
    # Arquivo .env do backend
    if [[ -f "$INSTALL_DIR/backend/.env" ]]; then
        log_success "Arquivo .env do backend existe"
    else
        log_error "Arquivo .env do backend não encontrado"
    fi
}

# Testar usuário do sistema
test_system_user() {
    log_header "VERIFICANDO USUÁRIO DO SISTEMA"
    
    if id "$SERVICE_USER" &>/dev/null; then
        log_success "Usuário $SERVICE_USER existe"
        
        # Verificar propriedade dos arquivos
        if [[ "$(stat -c '%U' $INSTALL_DIR)" == "$SERVICE_USER" ]]; then
            log_success "Propriedade dos arquivos está correta"
        else
            log_error "Propriedade dos arquivos incorreta"
        fi
    else
        log_error "Usuário $SERVICE_USER não encontrado"
    fi
}

# Testar serviços
test_services() {
    log_header "VERIFICANDO SERVIÇOS"
    
    # PostgreSQL
    if systemctl is-active --quiet postgresql; then
        log_success "PostgreSQL está ativo"
    else
        log_error "PostgreSQL não está ativo"
    fi
    
    # Backend
    if systemctl is-active --quiet bgpview-backend; then
        log_success "Serviço bgpview-backend está ativo"
    else
        log_error "Serviço bgpview-backend não está ativo"
        log_info "Status: $(systemctl is-active bgpview-backend)"
    fi
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        log_success "Nginx está ativo"
    else
        log_error "Nginx não está ativo"
    fi
}

# Testar banco de dados
test_database() {
    log_header "VERIFICANDO BANCO DE DADOS"
    
    # Tentar conectar ao banco
    if sudo -u postgres psql -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
        log_success "Conexão com banco de dados funcionando"
        
        # Verificar tabelas principais
        local expected_tables=("users" "routers" "peerings" "peering_groups" "peering_group_association")
        local missing_tables=()
        
        for table in "${expected_tables[@]}"; do
            if sudo -u postgres psql -d $DB_NAME -t -c "SELECT to_regclass('public.$table');" 2>/dev/null | grep -q "$table"; then
                log_success "Tabela '$table' existe"
            else
                log_error "Tabela '$table' não encontrada"
                missing_tables+=("$table")
            fi
        done
        
        if [[ ${#missing_tables[@]} -eq 0 ]]; then
            log_success "Todas as tabelas necessárias existem"
            
            # Verificar dados nas tabelas
            local user_count=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
            if [[ $user_count -gt 0 ]]; then
                log_success "Usuários encontrados no banco ($user_count)"
            else
                log_warning "Nenhum usuário encontrado no banco"
            fi
            
        else
            log_error "Tabelas faltando: ${missing_tables[*]}"
        fi
        
        # Verificar estrutura do banco
        local total_tables=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
        if [[ $total_tables -gt 0 ]]; then
            log_success "Total de tabelas no banco: $total_tables"
        else
            log_error "Nenhuma tabela encontrada no banco"
        fi
    else
        log_error "Erro na conexão com banco de dados"
        
        # Verificar se PostgreSQL está rodando
        if systemctl is-active --quiet postgresql; then
            log_info "PostgreSQL está ativo, mas conexão falhou"
            log_info "Verifique as credenciais e configurações"
        else
            log_error "PostgreSQL não está ativo"
        fi
    fi
}

# Testar APIs
test_api() {
    log_header "VERIFICANDO API"
    
    local api_url="http://localhost:8000"
    local max_attempts=10
    local attempt=1
    
    # Aguardar API iniciar
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$api_url/docs" > /dev/null 2>&1; then
            log_success "API está respondendo"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "API não está respondendo após $max_attempts tentativas"
            return
        fi
        
        log_info "Tentativa $attempt/$max_attempts - Aguardando API..."
        sleep 2
        ((attempt++))
    done
    
    # Testar endpoints específicos
    if curl -f -s "$api_url/docs" > /dev/null 2>&1; then
        log_success "Documentação da API acessível"
    else
        log_error "Documentação da API não acessível"
    fi
    
    if curl -f -s "$api_url/openapi.json" > /dev/null 2>&1; then
        log_success "OpenAPI JSON acessível"
    else
        log_error "OpenAPI JSON não acessível"
    fi
}

# Testar frontend via Nginx
test_frontend() {
    log_header "VERIFICANDO FRONTEND"
    
    local web_url="http://localhost"
    
    # Testar página principal
    if curl -f -s "$web_url" > /dev/null 2>&1; then
        log_success "Frontend acessível via Nginx"
    else
        log_error "Frontend não acessível via Nginx"
        return
    fi
    
    # Testar proxy da API
    if curl -f -s "$web_url/docs" > /dev/null 2>&1; then
        log_success "Proxy da API funcionando"
    else
        log_error "Proxy da API não funcionando"
    fi
    
    # Verificar arquivos estáticos
    if curl -f -s "$web_url/assets/" > /dev/null 2>&1 || [[ -d "$INSTALL_DIR/frontend/dist/assets" ]]; then
        log_success "Arquivos estáticos disponíveis"
    else
        log_warning "Arquivos estáticos podem não estar disponíveis"
    fi
}

# Testar configuração do Nginx
test_nginx_config() {
    log_header "VERIFICANDO CONFIGURAÇÃO NGINX"
    
    # Testar sintaxe
    if nginx -t &>/dev/null; then
        log_success "Configuração do Nginx válida"
    else
        log_error "Erro na configuração do Nginx"
    fi
    
    # Verificar site habilitado
    if [[ -f /etc/nginx/sites-enabled/bgpview ]]; then
        log_success "Site BGPView habilitado no Nginx"
    else
        log_error "Site BGPView não habilitado no Nginx"
    fi
}

# Testar portas
test_ports() {
    log_header "VERIFICANDO PORTAS"
    
    # Porta 80 (HTTP)
    if ss -tulpn | grep -q ":80 "; then
        log_success "Porta 80 (HTTP) está aberta"
    else
        log_error "Porta 80 (HTTP) não está aberta"
    fi
    
    # Porta 8000 (Backend)
    if ss -tulpn | grep -q ":8000 "; then
        log_success "Porta 8000 (Backend) está aberta"
    else
        log_error "Porta 8000 (Backend) não está aberta"
    fi
    
    # Porta 5432 (PostgreSQL)
    if ss -tulpn | grep -q ":5432 "; then
        log_success "Porta 5432 (PostgreSQL) está aberta"
    else
        log_error "Porta 5432 (PostgreSQL) não está aberta"
    fi
    
    # Porta 443 (HTTPS) - opcional
    if ss -tulpn | grep -q ":443 "; then
        log_success "Porta 443 (HTTPS) está aberta"
    else
        log_info "Porta 443 (HTTPS) não configurada (normal se não usar SSL)"
    fi
}

# Testar scripts de manutenção
test_maintenance_scripts() {
    log_header "VERIFICANDO SCRIPTS DE MANUTENÇÃO"
    
    local scripts=("bgpview-status" "bgpview-backup" "bgpview-update")
    
    for script in "${scripts[@]}"; do
        if [[ -x "/usr/local/bin/$script" ]]; then
            log_success "Script $script está disponível"
        else
            log_error "Script $script não encontrado ou não executável"
        fi
    done
    
    # Testar diretório de scripts
    if [[ -d "/usr/local/bin/bgpview" ]]; then
        log_success "Diretório de scripts existe"
    else
        log_error "Diretório de scripts não encontrado"
    fi
}

# Testar logs
test_logs() {
    log_header "VERIFICANDO LOGS"
    
    # Logs do backend
    if journalctl -u bgpview-backend --no-pager -n 5 &>/dev/null; then
        log_success "Logs do backend acessíveis"
        
        # Verificar se há erros recentes
        local errors=$(journalctl -u bgpview-backend --since "5 minutes ago" -p err --no-pager -q | wc -l)
        if [[ $errors -eq 0 ]]; then
            log_success "Nenhum erro recente no backend"
        else
            log_warning "$errors erro(s) recente(s) no backend"
        fi
    else
        log_error "Logs do backend não acessíveis"
    fi
    
    # Logs do Nginx
    if [[ -f /var/log/nginx/access.log ]]; then
        log_success "Logs do Nginx disponíveis"
    else
        log_error "Logs do Nginx não encontrados"
    fi
}

# Mostrar resumo dos testes
show_test_summary() {
    log_header "RESUMO DOS TESTES"
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    
    echo -e "${BOLD}Estatísticas:${NC}"
    echo -e "• Total de testes: $total_tests"
    echo -e "• ${GREEN}Passou: $TESTS_PASSED${NC}"
    echo -e "• ${RED}Falhou: $TESTS_FAILED${NC}"
    
    local success_rate=0
    if [[ $total_tests -gt 0 ]]; then
        success_rate=$((TESTS_PASSED * 100 / total_tests))
    fi
    
    echo -e "• Taxa de sucesso: $success_rate%"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}🎉 TODOS OS TESTES PASSARAM!${NC}"
        echo -e "${GREEN}O BGPView está funcionando corretamente.${NC}"
    elif [[ $success_rate -ge 80 ]]; then
        echo -e "${YELLOW}${BOLD}⚠️  MAIORIA DOS TESTES PASSOU${NC}"
        echo -e "${YELLOW}O sistema está funcionando, mas com alguns problemas menores.${NC}"
    else
        echo -e "${RED}${BOLD}❌ MUITOS TESTES FALHARAM${NC}"
        echo -e "${RED}O sistema pode não estar funcionando corretamente.${NC}"
        echo -e "${YELLOW}Verifique os logs e a documentação para resolver os problemas.${NC}"
    fi
    
    echo ""
    echo -e "${BOLD}Próximos passos:${NC}"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo "• Acesse o sistema via navegador"
        echo "• Faça login com as credenciais do administrador"
        echo "• Configure seus roteadores e peerings"
    else
        echo "• Verifique os logs: journalctl -u bgpview-backend -f"
        echo "• Execute: bgpview-status"
        echo "• Consulte a documentação para solução de problemas"
    fi
}

# Função principal
main() {
    show_banner
    
    test_installation_files
    test_system_user
    test_services
    test_database
    test_api
    test_frontend
    test_nginx_config
    test_ports
    test_maintenance_scripts
    test_logs
    
    show_test_summary
    
    # Código de saída baseado nos resultados
    if [[ $TESTS_FAILED -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Executar testes
main "$@"
