# Sistema de Backup e Limpeza Automática - BGPControl

Este documento descreve as funcionalidades implementadas para **backup automático com compactação** e **limpeza automática de logs de auditoria** no sistema BGPControl.

## 📋 Funcionalidades Implementadas

### ✅ 1. Backup de Banco de Dados com Compactação

- **Formato de arquivo**: `.sql.gz` (compactado com gzip)
- **Compressão**: Reduz tamanho em ~90% (de 105KB para 10KB no exemplo)
- **Backup automático**: Diário às 02:00
- **Retenção**: 30 dias (configurável)
- **Local**: `/var/backups/bgpcontrol/`

### ✅ 2. Limpeza Automática de Logs de Auditoria

- **Retenção**: 6 meses (180 dias)
- **Execução**: Domingos às 03:00
- **Critério**: Remove logs com `created_at < NOW() - INTERVAL '6 months'`
- **Relatórios**: Gera relatórios detalhados de cada limpeza

### ✅ 3. Automação Completa

- **Cron jobs** configurados automaticamente
- **Scripts de gerenciamento** para execução manual
- **Logs rotacionados** automaticamente
- **Relatórios** de todas as operações

## 🛠️ Instalação e Configuração

### Script de Configuração Automática

Execute o script de configuração uma única vez:

```bash
sudo /opt/bgpcontrol/setup_automation.sh
```

Este script configura:
- ✅ Diretórios necessários
- ✅ Permissões corretas
- ✅ Cron jobs automáticos
- ✅ Logrotate
- ✅ Scripts de gerenciamento

## 📱 Comandos Disponíveis

### Backup Manual
```bash
bgpcontrol-backup-now
```
Executa backup imediato do banco de dados.

### Limpeza Manual de Logs
```bash
bgpcontrol-cleanup-audit
```
Executa limpeza imediata dos logs de auditoria.

### Status da Automação
```bash
bgpcontrol-automation-status
```
Mostra status dos cron jobs, backups e logs.

### Comandos Existentes
```bash
bgpcontrol-status         # Status geral do sistema
bgpcontrol-check-db       # Verificação do banco
bgpcontrol-backup         # Backup antigo (não compactado)
```

## 📊 Monitoramento

### Arquivos de Log
- **Backup**: `/var/log/bgpcontrol_backup.log`
- **Limpeza**: `/var/log/bgpcontrol_audit_cleanup.log`
- **Saúde**: `/var/log/bgpcontrol_health.log`

### Relatórios Automáticos
- **Backup**: `/var/log/bgpcontrol/backup_report_YYYYMMDD_HHMMSS.txt`
- **Limpeza**: `/var/log/bgpcontrol/audit_cleanup_report_YYYYMMDD_HHMMSS.txt`

### Estrutura de Diretórios
```
/var/backups/bgpcontrol/        # Backups compactados (.sql.gz)
/var/log/bgpcontrol/            # Relatórios detalhados
/var/log/bgpcontrol_*.log       # Logs das operações
```

## ⏰ Agendamento Automático

### Cron Jobs Configurados

```cron
# Backup diário às 02:00
0 2 * * * backup_cron.py

# Limpeza de logs aos domingos às 03:00 (manter 6 meses)
0 3 * * 0 audit_cleanup_cron.py

# Verificação de saúde diária às 01:00
0 1 * * * bgpcontrol-check-db
```

## 🔧 Configurações

### Variáveis de Ambiente

Você pode personalizar as configurações criando arquivos de ambiente:

```bash
# Para backup (opcional)
export BACKUP_DESCRIPTION="Backup personalizado"
export BACKUP_DAYS_TO_KEEP=60

# Para limpeza de auditoria (opcional)
export AUDIT_CLEANUP_MONTHS=12  # Manter 12 meses em vez de 6
```

### Alterar Configurações

Para alterar os agendamentos, edite o crontab:

```bash
sudo -u bgpcontrol crontab -e
```

## 📈 Benefícios da Compactação

### Exemplo Real
- **Arquivo original**: 105.511 bytes (105 KB)
- **Arquivo compactado**: 10.657 bytes (10 KB)
- **Redução**: ~90% de economia de espaço

### Vantagens
- ✅ **Menor uso de disco**
- ✅ **Backup mais rápido**
- ✅ **Transferência mais eficiente**
- ✅ **Mais backups no mesmo espaço**

## 🗄️ API Endpoints

Além da automação, as funcionalidades estão disponíveis via API:

### Backup
- `POST /api/database-backup/create` - Criar backup
- `GET /api/database-backup/list` - Listar backups
- `GET /api/database-backup/download/{backup_id}` - Download
- `POST /api/database-backup/restore` - Restaurar backup
- `DELETE /api/database-backup/{backup_id}` - Remover backup

### Limpeza de Auditoria
- `GET /api/audit-cleanup/stats` - Estatísticas dos logs
- `POST /api/audit-cleanup/cleanup` - Executar limpeza
- `POST /api/audit-cleanup/auto-cleanup` - Configurar limpeza automática

## 🔒 Segurança

### Permissões
- Scripts executam como usuário `bgpcontrol` (não root)
- Backups protegidos com permissões apropriadas
- Logs de auditoria mantêm integridade referencial

### Backup de Segurança
Antes de qualquer operação crítica, o sistema faz backup de segurança:
- Crontab atual é salvo antes de modificações
- Backups antigos são mantidos por período de retenção

## 🚨 Troubleshooting

### Verificar Status dos Serviços
```bash
systemctl status bgpcontrol-backend
systemctl status crond
```

### Verificar Logs de Erro
```bash
journalctl -u crond -f
tail -f /var/log/bgpcontrol_*.log
```

### Testar Manualmente
```bash
# Testar backup
cd /opt/bgpcontrol/backend
source .venv/bin/activate
python3 backup_cron.py

# Testar limpeza
python3 audit_cleanup_cron.py
```

### Verificar Espaço em Disco
```bash
df -h /var/backups/bgpcontrol/
du -sh /var/backups/bgpcontrol/*
```

## 📋 Checklist de Verificação

- [ ] Backup automático rodando às 02:00
- [ ] Limpeza de logs rodando aos domingos às 03:00
- [ ] Backups sendo compactados (.sql.gz)
- [ ] Logs antigos sendo removidos (6+ meses)
- [ ] Relatórios sendo gerados
- [ ] Logs rotacionando automaticamente
- [ ] Comandos manuais funcionando

## 🔄 Rotina de Manutenção

### Mensal
- Verificar espaço em disco: `df -h`
- Revisar relatórios de backup
- Verificar logs de erro

### Trimestral
- Testar restauração de backup
- Revisar configurações de retenção
- Verificar integridade dos logs

### Anual
- Revisar e atualizar políticas de backup
- Avaliar crescimento do banco de dados
- Considerar ajustar períodos de retenção

---

## 📞 Suporte

Para suporte ou dúvidas sobre estas funcionalidades:

1. **Verificar logs**: Sempre consulte os logs primeiro
2. **Executar manualmente**: Use os comandos manuais para debug
3. **Verificar permissões**: Problemas comuns relacionados a permissões
4. **Verificar espaço**: Backup pode falhar por falta de espaço

---

**Implementado em:** 6 de julho de 2025  
**Versão:** 2.0.0  
**Compatibilidade:** BGPControl v1.0+
