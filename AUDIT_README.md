# Sistema de Logs de Auditoria - BGPView

Este documento descreve como instalar e usar o sistema de logs de auditoria implementado no BGPView.

## Funcionalidades

O sistema de logs de auditoria oferece:

### 📊 **Rastreamento Completo**
- **Login/Logout** de usuários
- **Criação, Edição e Exclusão** de recursos (routers, peerings, grupos, usuários)
- **Consultas** no Looking Glass
- **Execução** de comandos SSH
- **Acesso** a páginas e APIs

### 🔍 **Informações Capturadas**
- **Usuário** que executou a ação
- **Data/Hora** da ação
- **Tipo de ação** (CREATE, UPDATE, DELETE, LOGIN, etc.)
- **Recurso afetado** (router, peering, user, etc.)
- **IP Address** do usuário
- **User Agent** do navegador
- **Dados da requisição** (para POST/PUT)
- **Status da resposta** HTTP
- **Tempo de resposta**

### 🎯 **Interface de Visualização**
- **Filtros avançados** por usuário, ação, tipo de recurso, data
- **Estatísticas** de uso e atividade
- **Detalhes completos** de cada ação
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
