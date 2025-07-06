# BGPControl - Resumo das Atualizações do Install.sh

## Novas Funcionalidades Implementadas

### 1. Sistema Completo de Backup e Restore
- **Backend:**
  - Serviço `DatabaseBackupService` com compactação automática (.sql.gz)
  - Router `database_backup.py` com endpoints completos
  - Schemas Pydantic para validação
  - Integração com pg_dump/psql usando caminhos absolutos

- **Frontend:**
  - API client `backup.ts`
  - Página completa `BackupDatabase.tsx`
  - Interface para criação, listagem, download, restore e exclusão de backups

### 2. Sistema de Limpeza de Logs de Auditoria
- **Backend:**
  - Serviço `AuditLogCleanupService` para limpeza automática
  - Router `audit_cleanup.py` com estatísticas e controles
  - Limpeza baseada em retenção (padrão: 6 meses)

- **Frontend:**
  - API client `auditCleanup.ts`
  - Página completa `AuditCleanup.tsx`
  - Interface para estatísticas, limpeza manual e automática

### 3. Automação Completa via Cron Jobs
- **Scripts de automação:**
  - `backup_cron.py` - Backup diário às 02:00
  - `audit_cleanup_cron.py` - Limpeza semanal aos domingos às 03:00
  - `setup_automation.sh` - Configuração automática de cron jobs

- **Gerenciamento de logs:**
  - Logrotate configurado automaticamente
  - Relatórios em `/var/log/bgpcontrol/`
  - Logs separados para backup e limpeza

### 4. Scripts de Gerenciamento Manual
- **Comandos disponíveis:**
  - `bgpcontrol-backup-now` - Backup manual
  - `bgpcontrol-cleanup-audit` - Limpeza manual de logs
  - `bgpcontrol-automation-status` - Status da automação
  - `bgpcontrol-setup-automation` - Reconfiguração da automação

## Alterações no install.sh

### 1. Função `create_maintenance_scripts()` Expandida
- Criação de diretórios de backup e logs com permissões corretas
- Scripts de cron automatizados para backup e limpeza
- Configuração automática de logrotate
- Scripts de gerenciamento manual

### 2. Correções de PATH
- **Problema resolvido:** pg_dump e psql não encontrados pelo systemd
- **Solução:** Caminhos absolutos `/usr/bin/pg_dump` e `/usr/bin/psql`
- Verificação de existência dos comandos na inicialização

### 3. Sequência de Instalação Atualizada
- Adicionada configuração automática de automação
- Chamada para `setup-automation.sh` durante a instalação
- Links simbólicos para todos os novos comandos

### 4. Informações de Conclusão Expandidas
- Seção de automação nas informações finais
- Documentação de novos comandos
- Detalhes sobre configuração de cron jobs

## Estrutura de Diretórios Criados

```
/var/backups/bgpcontrol/          # Arquivos de backup (.sql.gz)
/var/log/bgpcontrol/              # Logs e relatórios da automação
├── backup_report_*.txt           # Relatórios de backup
├── audit_cleanup_report_*.txt    # Relatórios de limpeza
/var/log/bgpcontrol_backup.log    # Log do processo de backup
/var/log/bgpcontrol_audit_cleanup.log # Log do processo de limpeza

/usr/local/bin/                   # Scripts de gerenciamento
├── bgpcontrol-backup-now
├── bgpcontrol-cleanup-audit
├── bgpcontrol-automation-status
├── bgpcontrol-setup-automation
```

## Configuração de Cron Jobs

- **Backup Diário:** `0 2 * * *` (02:00 todos os dias)
- **Limpeza Semanal:** `0 3 * * 0` (03:00 todos os domingos)
- **Usuário:** bgpcontrol
- **Logs:** Redirecionados para arquivos específicos

## Permissões e Segurança

- Todos os diretórios criados com permissões corretas
- Usuário `bgpcontrol` proprietário de arquivos e processos
- Scripts executáveis apenas para usuários autorizados
- Logs com rotação automática configurada

## Menu Frontend Atualizado

- **Cadastros > Backup do Banco** - Gerenciamento completo de backups
- **Cadastros > Limpeza de Logs** - Controle de logs de auditoria
- Ícones apropriados para cada funcionalidade

## Testado e Funcionando

- ✅ Backend API endpoints funcionais
- ✅ Frontend build sem erros
- ✅ Permissões corretas em todos os diretórios
- ✅ Serviço systemd reiniciado com sucesso
- ✅ Caminhos absolutos para comandos PostgreSQL
- ✅ Compactação de backup (.sql.gz) funcionando

## Como Usar Após Instalação

1. **Backup Manual:**
   ```bash
   bgpcontrol-backup-now
   ```

2. **Limpeza Manual:**
   ```bash
   bgpcontrol-cleanup-audit
   ```

3. **Status da Automação:**
   ```bash
   bgpcontrol-automation-status
   ```

4. **Reconfigurar Automação:**
   ```bash
   bgpcontrol-setup-automation
   ```

5. **Via Interface Web:**
   - Acesse: Cadastros > Backup do Banco
   - Acesse: Cadastros > Limpeza de Logs

Todas as funcionalidades estão prontas para produção e integradas ao processo de instalação.
