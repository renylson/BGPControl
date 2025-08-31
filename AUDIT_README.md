# Sistema de Auditoria e Logs - BGPControl

**Desenvolvido por:** Renylson Marques  
**E-mail:** renylsonm@gmail.com

Sistema completo de auditoria e rastreamento de ações implementado no BGPControl. Esta funcionalidade demonstra competências em segurança de aplicações, middleware customizado, logging estruturado e compliance.

## 🎯 Objetivos da Auditoria

O sistema de auditoria foi desenvolvido para atender:

- **Compliance**: Rastreamento completo de ações para auditoria
- **Segurança**: Detecção de atividades suspeitas e monitoramento
- **Debugging**: Facilitar investigação de problemas e erros
- **Analytics**: Análise de uso e comportamento dos usuários
- **Governança**: Controle de acesso e responsabilização

## 🔍 Competências Demonstradas

### Implementação de Middleware
- Interceptação transparente de requisições HTTP
- Captura de contexto sem impacto na performance
- Processamento assíncrono de logs
- Tratamento robusto de erros

### Modelagem de Dados
- Schema normalizado para logs de auditoria
- Índices otimizados para consultas rápidas
- Relacionamentos com entidades do sistema
- Retenção e arquivamento de dados

### Segurança e Privacy
- Sanitização de dados sensíveis
- Hashing de informações críticas
- Controle de acesso aos logs
- Anonimização quando necessário

## 🏗️ Arquitetura do Sistema de Auditoria

### Camadas da Auditoria

```
┌─────────────────┐
│   Frontend      │ ── User Actions ──┐
│   React/TS      │                   │
└─────────────────┘                   │
                                     │
┌─────────────────┐                   │
│   Middleware    │ ◄─────────────────┘
│   Audit Layer   │
└─────────────────┘
          │
          ▼
┌─────────────────┐    ┌─────────────────┐
│   Audit Model   │◄──►│   PostgreSQL    │
│   SQLAlchemy    │    │   audit_logs    │
└─────────────────┘    └─────────────────┘
```

### Implementação Técnica

#### Middleware de Auditoria
```python
# app/middleware/audit.py
@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    # Captura contexto da requisição
    start_time = time.time()
    user_id = get_current_user_id(request)
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    
    # Executa a requisição
    response = await call_next(request)
    
    # Calcula tempo de resposta
    process_time = time.time() - start_time
    
    # Log assíncrono em background
    asyncio.create_task(
        log_audit_action(
            user_id=user_id,
            action=request.method,
            resource=request.url.path,
            ip_address=client_ip,
            user_agent=user_agent,
            status_code=response.status_code,
            response_time=process_time
        )
    )
    
    return response
```

#### Modelo de Dados
```python
# app/models/audit_log.py
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    action = Column(String(20), nullable=False, index=True)  # CREATE, UPDATE, DELETE, etc.
    resource_type = Column(String(50), nullable=False, index=True)  # router, peering, user
    resource_id = Column(Integer, nullable=True)
    ip_address = Column(String(45), nullable=False, index=True)  # IPv4/IPv6
    user_agent = Column(Text, nullable=True)
    request_data = Column(JSON, nullable=True)  # Dados da requisição
    status_code = Column(Integer, nullable=False)
    response_time = Column(Float, nullable=False)  # Em segundos
    details = Column(JSON, nullable=True)  # Metadados adicionais
    
    # Relacionamentos
    user = relationship("User", back_populates="audit_logs")
```

## 📊 Funcionalidades de Rastreamento

### Ações Monitoradas Automaticamente

**Autenticação e Autorização:**
- ✅ Login/Logout de usuários
- ✅ Tentativas de acesso negado
- ✅ Expiração de tokens JWT
- ✅ Mudanças de perfil/permissões

**Operações CRUD:**
- ✅ Criação de recursos (routers, peerings, grupos, usuários)
- ✅ Edição de configurações e dados
- ✅ Exclusão de registros
- ✅ Consultas e listagens

**Operações BGP:**
- ✅ Execução de comandos SSH
- ✅ Ativação/desativação de peerings
- ✅ Consultas Looking Glass
- ✅ Operações em lote (grupos)

**Administração:**
- ✅ Backups de banco de dados
- ✅ Restauração de dados
- ✅ Limpeza de logs antigos
- ✅ Configurações de sistema

### Informações Capturadas

```typescript
interface AuditLogEntry {
  id: number;
  user_id?: number;           // ID do usuário (null para ações anônimas)
  timestamp: Date;            // Data/hora UTC da ação
  action: AuditAction;        // Tipo de ação executada
  resource_type: string;      // Tipo de recurso afetado
  resource_id?: number;       // ID do recurso específico
  ip_address: string;         // IP do cliente (IPv4/IPv6)
  user_agent?: string;        // Browser/client information
  request_data?: object;      // Dados enviados na requisição
  status_code: number;        // Código de resposta HTTP
  response_time: number;      // Tempo de processamento (ms)
  details?: object;           // Metadados contextuais
}
```

## �️ Interface de Visualização

### Dashboard de Auditoria
- **Métricas em Tempo Real**: Ações por hora/dia/semana
- **Top Usuários**: Usuários mais ativos
- **Ações Recentes**: Stream em tempo real
- **Alertas**: Detecção de padrões suspeitos

### Filtros Avançados
```typescript
interface AuditFilters {
  user_id?: number[];         // Filtrar por usuários específicos
  action?: AuditAction[];     // Tipos de ação
  resource_type?: string[];   // Tipos de recurso
  date_from?: Date;          // Data inicial
  date_to?: Date;            // Data final
  ip_address?: string;       // IP específico
  status_code?: number[];    // Códigos de resposta
  search?: string;           // Busca livre em detalhes
}
```

### Relatórios Personalizados
- **Exportação CSV/Excel**: Dados filtrados para análise
- **Relatórios Programados**: Envio automático por email
- **Gráficos Interativos**: Visualizações com Recharts
- **Drill-down**: Análise detalhada por usuário/recurso
- **Paginação** e ordenação
- **Limpeza** de logs antigos (apenas admin)

## Instalação

### 1. Instalar Dependências do Backend

```bash
cd /opt/bgpview/backend
pip3 install alembic psycopg2-binary --break-system-packages
```

### 2. Criar Tabela de Auditoria

```bash
cd /opt/bgpview/backend
./setup_audit.sh
```

**Ou manualmente via SQL:**

```bash
# Carregue as configurações
source config.env

# Execute o SQL
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f create_audit_table.sql
```

### 3. Instalar Dependências do Frontend

```bash
cd /opt/bgpview/frontend
npm install @mui/x-date-pickers date-fns
```

### 4. Reiniciar Serviços

```bash
# Reiniciar backend para carregar o middleware
systemctl restart bgpview-backend

# Reiniciar frontend (se necessário)
systemctl restart bgpview-frontend
```

## Como Usar

### Acessando os Logs

1. **Faça login** no sistema BGPView
2. **Acesse o menu** "Logs de Auditoria"
3. **Use os filtros** para encontrar logs específicos:
   - **Usuário**: Visualize ações de um usuário específico
   - **Ação**: Filtre por tipo de ação (LOGIN, CREATE, UPDATE, etc.)
   - **Recurso**: Filtre por tipo de recurso (router, peering, etc.)
   - **Data**: Defina período específico

### Permissões

- **Operadores**: Veem apenas seus próprios logs
- **Administradores**: Veem logs de todos os usuários
- **Limpeza de logs**: Apenas administradores

### Tipos de Ações Registradas

| Ação | Descrição |
|------|-----------|
| `LOGIN` | Login no sistema |
| `LOGOUT` | Logout do sistema |
| `CREATE` | Criação de recurso |
| `UPDATE` | Atualização de recurso |
| `DELETE` | Exclusão de recurso |
| `READ` | Visualização/Consulta |
| `EXECUTE` | Execução de comando SSH |
| `QUERY` | Consulta Looking Glass |
| `VIEW` | Visualização de dashboard |
| `*_FAILED` | Ação que falhou |

### Tipos de Recursos

| Recurso | Descrição |
|---------|-----------|
| `user` | Usuários |
| `router` | Roteadores |
| `peering` | Peerings |
| `peering_group` | Grupos de Peering |
| `dashboard` | Dashboard |
| `looking_glass` | Looking Glass |
| `ssh` | Comandos SSH |

## Manutenção

### Limpeza de Logs Antigos

Para manter o banco de dados performático, remova logs antigos regularmente:

1. **Via Interface**: Acesse "Logs de Auditoria" → "Limpar Logs Antigos"
2. **Via API**: `DELETE /audit/logs/cleanup?days=90`

### Backup dos Logs

Os logs de auditoria são críticos. Inclua a tabela `audit_logs` em seus backups:

```bash
pg_dump -h $DB_HOST -U $DB_USER -t audit_logs $DB_NAME > audit_logs_backup.sql
```

### Monitoramento

- **Tamanho da tabela**: Monitore o crescimento da tabela `audit_logs`
- **Performance**: Verifique se os índices estão sendo utilizados
- **Espaço em disco**: Logs podem crescer rapidamente em sistemas ativos

## Troubleshooting

### Logs não aparecem

1. **Verifique** se a tabela foi criada:
   ```sql
   SELECT COUNT(*) FROM audit_logs;
   ```

2. **Verifique** se o middleware está ativo no backend
3. **Verifique** logs do backend em `uvicorn.log`

### Performance lenta

1. **Verifique índices**:
   ```sql
   SELECT schemaname, tablename, indexname 
   FROM pg_indexes 
   WHERE tablename = 'audit_logs';
   ```

2. **Limpe logs antigos** se a tabela estiver muito grande
3. **Analise queries** com `EXPLAIN ANALYZE`

### Erros de permissão

- **Operadores** só veem seus próprios logs
- **Administradores** veem todos os logs
- Verifique se o usuário tem o perfil correto

## Configuração Avançada

### Personalizar Filtros do Middleware

Edite `/opt/bgpview/backend/app/middleware/audit.py`:

```python
def should_log(self, path: str, method: str) -> bool:
    # Adicione/remova paths que devem ser logados
    skip_paths = ["/docs", "/health", "/static"]
    # ... resto da lógica
```

### Adicionar Campos Customizados

1. **Modifique** o modelo em `models/audit_log.py`
2. **Crie migração** do banco de dados
3. **Atualize** schemas e frontend

### Integração com SIEM

Os logs podem ser exportados para sistemas SIEM:

```bash
# Exportar logs em JSON
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT row_to_json(al) FROM (
  SELECT * FROM audit_logs 
  WHERE created_at >= NOW() - INTERVAL '1 day'
) al;" > audit_logs.json
```

## Suporte

Para suporte ou dúvidas:
- **Documentação**: Consulte este README
- **Logs**: Verifique `uvicorn.log` para erros do backend
- **Issues**: Reporte problemas no repositório do projeto

---

**Implementado em:** 3 de julho de 2025  
**Versão:** 1.0.0
