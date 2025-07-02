#!/bin/bash

#################################################################
#                                                               #
#           BGPView - Script de Verificação do Banco           #
#           Verifica e repara estrutura do banco               #
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
██╔══██╗██║   ██║██╔═══╝ ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║
██████╔╝╚██████╔╝██║      ╚████╔╝ ██║███████╗╚███╔███╔╝
╚═════╝  ╚═════╝ ╚═╝       ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ 
                                                        
            VERIFICAÇÃO DO BANCO DE DADOS
EOF
    echo -e "${NC}\n"
    echo -e "${CYAN}Verificando e reparando estrutura do banco de dados...${NC}\n"
}

# Verificar se está executando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root!"
        log_info "Execute: sudo bash check-database.sh"
        exit 1
    fi
}

# Verificar conexão com o banco
test_connection() {
    log_header "TESTANDO CONEXÃO COM O BANCO"
    
    if sudo -u postgres psql -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
        log_success "Conexão com PostgreSQL estabelecida"
        local version=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT version();" | head -1)
        log_info "Versão: $version"
        return 0
    else
        log_error "Erro na conexão com o banco de dados"
        log_error "Verifique se PostgreSQL está rodando e o banco '$DB_NAME' existe"
        return 1
    fi
}

# Verificar tabelas existentes
check_tables() {
    log_header "VERIFICANDO TABELAS"
    
    local expected_tables=("users" "routers" "peerings" "peering_groups" "peering_group_association")
    local existing_tables=()
    local missing_tables=()
    
    # Listar tabelas existentes
    local all_tables=$(sudo -u postgres psql -d $DB_NAME -t -c "
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename;
    " 2>/dev/null)
    
    if [[ -n "$all_tables" ]]; then
        log_info "Tabelas encontradas no banco:"
        echo "$all_tables" | while read -r table; do
            if [[ -n "$table" ]]; then
                echo "  • $table"
                existing_tables+=("$table")
            fi
        done
    else
        log_warning "Nenhuma tabela encontrada no banco"
    fi
    
    # Verificar tabelas necessárias
    echo ""
    log_info "Verificando tabelas necessárias:"
    for table in "${expected_tables[@]}"; do
        if sudo -u postgres psql -d $DB_NAME -t -c "SELECT to_regclass('public.$table');" 2>/dev/null | grep -q "$table"; then
            log_success "Tabela '$table' existe"
        else
            log_error "Tabela '$table' não encontrada"
            missing_tables+=("$table")
        fi
    done
    
    if [[ ${#missing_tables[@]} -eq 0 ]]; then
        log_success "Todas as tabelas necessárias estão presentes"
        return 0
    else
        log_error "Tabelas faltando: ${missing_tables[*]}"
        return 1
    fi
}

# Verificar dados nas tabelas
check_data() {
    log_header "VERIFICANDO DADOS NAS TABELAS"
    
    local tables=("users:Usuários" "routers:Roteadores" "peerings:Peerings" "peering_groups:Grupos")
    
    for table_info in "${tables[@]}"; do
        local table=$(echo $table_info | cut -d: -f1)
        local name=$(echo $table_info | cut -d: -f2)
        
        if sudo -u postgres psql -d $DB_NAME -t -c "SELECT to_regclass('public.$table');" 2>/dev/null | grep -q "$table"; then
            local count=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
            if [[ "$count" =~ ^[0-9]+$ ]]; then
                if [[ $count -gt 0 ]]; then
                    log_success "$name: $count registro(s)"
                else
                    log_info "$name: nenhum registro"
                fi
            else
                log_warning "$name: erro ao contar registros"
            fi
        else
            log_error "$name: tabela não existe"
        fi
    done
}

# Reparar banco de dados
repair_database() {
    log_header "REPARANDO BANCO DE DADOS"
    
    read -p "Deseja tentar reparar o banco de dados? (s/N): " confirm
    if [[ ! $confirm =~ ^[SsYy]$ ]]; then
        log_info "Reparo cancelado pelo usuário"
        return 0
    fi
    
    log_info "Iniciando reparo do banco de dados..."
    
    # Verificar se ambiente virtual existe
    if [[ ! -d "$INSTALL_DIR/backend/.venv" ]]; then
        log_error "Ambiente virtual não encontrado em $INSTALL_DIR/backend/.venv"
        return 1
    fi
    
    # Tentar usar Alembic primeiro
    log_info "Tentando usar Alembic para criar/atualizar tabelas..."
    if sudo -u $SERVICE_USER bash -c "source $INSTALL_DIR/backend/.venv/bin/activate && cd $INSTALL_DIR/backend && alembic upgrade head" 2>/dev/null; then
        log_success "Alembic executado com sucesso"
    else
        log_warning "Alembic falhou, tentando script personalizado..."
        
        # Usar script de inicialização personalizado
        if [[ -f "$INSTALL_DIR/backend/init_database.py" ]]; then
            sudo -u $SERVICE_USER bash -c "
                source $INSTALL_DIR/backend/.venv/bin/activate
                cd $INSTALL_DIR/backend
                python3 init_database.py
            "
            
            if [[ $? -eq 0 ]]; then
                log_success "Script personalizado executado com sucesso"
            else
                log_error "Script personalizado falhou"
                return 1
            fi
        else
            log_warning "Script personalizado não encontrado, usando método básico..."
            
            # Método básico de criação de tabelas
            sudo -u $SERVICE_USER bash -c "
                source $INSTALL_DIR/backend/.venv/bin/activate
                cd $INSTALL_DIR/backend
                python3 -c 'from app.core.init_db import init_db; import asyncio; asyncio.run(init_db())'
            "
            
            if [[ $? -eq 0 ]]; then
                log_success "Método básico executado com sucesso"
            else
                log_error "Todos os métodos de reparo falharam"
                return 1
            fi
        fi
    fi
    
    log_success "Reparo concluído"
    return 0
}

# Verificar integridade referencial
check_integrity() {
    log_header "VERIFICANDO INTEGRIDADE REFERENCIAL"
    
    # Verificar foreign keys
    local fk_checks=(
        "peerings:router_id:routers:id:Peerings->Roteadores"
        "peering_groups:router_id:routers:id:Grupos->Roteadores"
        "peering_group_association:group_id:peering_groups:id:Associação->Grupos"
        "peering_group_association:peering_id:peerings:id:Associação->Peerings"
    )
    
    for check in "${fk_checks[@]}"; do
        IFS=':' read -r table fk_col ref_table ref_col desc <<< "$check"
        
        if sudo -u postgres psql -d $DB_NAME -t -c "SELECT to_regclass('public.$table');" 2>/dev/null | grep -q "$table" && \
           sudo -u postgres psql -d $DB_NAME -t -c "SELECT to_regclass('public.$ref_table');" 2>/dev/null | grep -q "$ref_table"; then
            
            local orphans=$(sudo -u postgres psql -d $DB_NAME -t -c "
                SELECT COUNT(*) 
                FROM $table t 
                LEFT JOIN $ref_table r ON t.$fk_col = r.$ref_col 
                WHERE t.$fk_col IS NOT NULL AND r.$ref_col IS NULL;
            " 2>/dev/null | tr -d ' ')
            
            if [[ "$orphans" == "0" ]]; then
                log_success "$desc: integridade OK"
            else
                log_warning "$desc: $orphans registro(s) órfão(s)"
            fi
        else
            log_warning "$desc: uma das tabelas não existe"
        fi
    done
}

# Otimizar banco
optimize_database() {
    log_header "OTIMIZANDO BANCO DE DADOS"
    
    log_info "Executando VACUUM ANALYZE..."
    if sudo -u postgres psql -d $DB_NAME -c "VACUUM ANALYZE;" > /dev/null 2>&1; then
        log_success "VACUUM ANALYZE executado com sucesso"
    else
        log_warning "Erro ao executar VACUUM ANALYZE"
    fi
    
    log_info "Atualizando estatísticas das tabelas..."
    if sudo -u postgres psql -d $DB_NAME -c "ANALYZE;" > /dev/null 2>&1; then
        log_success "Estatísticas atualizadas"
    else
        log_warning "Erro ao atualizar estatísticas"
    fi
}

# Mostrar resumo
show_summary() {
    log_header "RESUMO DA VERIFICAÇÃO"
    
    echo -e "${BOLD}Status do Banco de Dados:${NC}"
    
    # Conexão
    if test_connection > /dev/null 2>&1; then
        echo -e "• ${GREEN}Conexão: OK${NC}"
    else
        echo -e "• ${RED}Conexão: ERRO${NC}"
    fi
    
    # Tabelas
    local table_count=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    if [[ "$table_count" -gt 0 ]]; then
        echo -e "• ${GREEN}Tabelas: $table_count encontrada(s)${NC}"
    else
        echo -e "• ${RED}Tabelas: Nenhuma encontrada${NC}"
    fi
    
    # Dados
    local user_count=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    echo -e "• ${CYAN}Usuários: $user_count${NC}"
    
    local router_count=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM routers;" 2>/dev/null | tr -d ' ' || echo "0")
    echo -e "• ${CYAN}Roteadores: $router_count${NC}"
    
    local peering_count=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM peerings;" 2>/dev/null | tr -d ' ' || echo "0")
    echo -e "• ${CYAN}Peerings: $peering_count${NC}"
    
    echo ""
    echo -e "${BOLD}Comandos úteis:${NC}"
    echo -e "• ${CYAN}Backup: bgpview-backup${NC}"
    echo -e "• ${CYAN}Status: bgpview-status${NC}"
    echo -e "• ${CYAN}Logs: journalctl -u bgpview-backend -f${NC}"
}

# Função principal
main() {
    show_banner
    check_root
    
    if ! test_connection; then
        log_error "Não foi possível conectar ao banco. Verifique a configuração."
        exit 1
    fi
    
    local tables_ok=true
    if ! check_tables; then
        tables_ok=false
        if repair_database; then
            log_info "Verificando novamente após reparo..."
            if check_tables; then
                tables_ok=true
            fi
        fi
    fi
    
    if [[ $tables_ok == true ]]; then
        check_data
        check_integrity
        optimize_database
    fi
    
    show_summary
    
    if [[ $tables_ok == true ]]; then
        echo -e "\n${GREEN}${BOLD}✅ Banco de dados está funcionando corretamente!${NC}"
        exit 0
    else
        echo -e "\n${RED}${BOLD}❌ Problemas encontrados no banco de dados${NC}"
        echo -e "${YELLOW}Execute o instalador novamente ou verifique os logs${NC}"
        exit 1
    fi
}

# Executar verificação
main "$@"
