# 🗄️ Sistema de Backup e Restore do Banco de Dados

Este documento descreve a funcionalidade completa de backup e restore do banco de dados PostgreSQL implementada no BGPControl.

## 📋 Características

### ✅ Funcionalidades Implementadas

**Backend (FastAPI):**
- ✅ API REST completa para gerenciamento de backups
- ✅ Criação automática de backups via `pg_dump`
- ✅ Listagem de backups disponíveis
- ✅ Download de arquivos de backup
- ✅ Restauração a partir de backup existente
- ✅ Upload e restauração de arquivos externos
- ✅ Exclusão de backups específicos
- ✅ Limpeza automática de backups antigos
- ✅ Status do sistema (espaço usado/disponível)
- ✅ Segurança: apenas administradores podem acessar

**Frontend (React + TypeScript):**
- ✅ Interface intuitiva para gerenciar backups
- ✅ Cards de status com métricas do sistema
- ✅ Tabela com lista de backups disponíveis
- ✅ Dialogs de confirmação para operações críticas
- ✅ Upload de arquivos SQL para restauração
- ✅ Feedback visual com snackbars
- ✅ Responsivo e integrado ao design do sistema

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│  React/TypeScript│◄──►│   FastAPI       │◄──►│   Database      │
│   BackupDB.tsx  │    │database_backup.py│    │   pg_dump       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Sistema Arquivos│
                       │/var/backups/    │
                       │  bgpcontrol/    │
                       └─────────────────┘
```

## 📁 Estrutura de Arquivos

### Backend
```
backend/
├── app/
│   ├── routers/
│   │   └── database_backup.py      # Endpoints da API
│   ├── schemas/
│   │   └── database_backup.py      # Modelos Pydantic
│   └── services/
│       └── database_backup.py      # Lógica de negócio
└── test_backup.py                  # Script de teste
```

### Frontend
```
frontend/src/
├── api/
│   └── backup.ts                   # Cliente API
├── pages/
│   └── BackupDatabase.tsx          # Interface principal
└── routes.tsx                      # Rota /backup
```

## 🔧 Configuração

### Diretório de Backups
```bash
sudo mkdir -p /var/backups/bgpcontrol
sudo chown -R bgpcontrol:bgpcontrol /var/backups/bgpcontrol
```

### Variáveis de Ambiente
As configurações são extraídas automaticamente da `DATABASE_URL`:
```bash
DATABASE_URL=postgresql+asyncpg://bgpcontrol:senha@localhost/bgpcontrol
```

## 🚀 Como Usar

### 1. Acessar a Interface
1. Faça login como administrador
2. Navegue para **Cadastros > Backup do Banco**
3. A interface mostrará o status atual do sistema

### 2. Criar Backup
1. Clique em **"Criar Backup"**
2. O sistema criará automaticamente um arquivo SQL
3. O backup aparecerá na lista com timestamp único

### 3. Restaurar Backup
**Opção A - Backup Existente:**
1. Clique no ícone "Restaurar" na linha do backup
2. Confirme que deseja substituir os dados atuais
3. Marque a checkbox de confirmação
4. Clique em "Restaurar"

**Opção B - Upload de Arquivo:**
1. Clique em **"Fazer Upload e Restaurar"**
2. Selecione um arquivo `.sql`
3. Confirme a substituição dos dados
4. Clique em "Restaurar"

### 4. Download de Backup
1. Clique no ícone "Download" na linha do backup
2. O arquivo será baixado automaticamente

### 5. Gerenciar Backups
**Excluir backup específico:**
1. Clique no ícone "Excluir" (🗑️)
2. Confirme a exclusão

**Limpeza automática:**
1. Clique em **"Limpeza de Backups"**
2. Defina quantos dias manter (padrão: 30)
3. Clique em "Executar Limpeza"

## 📡 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/database-backup/create` | Criar novo backup |
| `GET` | `/api/database-backup/list` | Listar todos os backups |
| `GET` | `/api/database-backup/download/{id}` | Download de backup |
| `POST` | `/api/database-backup/restore` | Restaurar backup |
| `POST` | `/api/database-backup/upload-restore` | Upload e restaurar |
| `DELETE` | `/api/database-backup/delete/{id}` | Excluir backup |
| `POST` | `/api/database-backup/cleanup` | Limpeza automática |
| `GET` | `/api/database-backup/status` | Status do sistema |

## 🔒 Segurança

### Controle de Acesso
- ✅ Apenas usuários com perfil **"Administrador"** podem acessar
- ✅ Autenticação via JWT obrigatória
- ✅ Validação de permissões em todos os endpoints

### Validações
- ✅ Confirmação obrigatória para operações destrutivas
- ✅ Validação de tipos de arquivo (apenas .sql)
- ✅ Verificação de integridade dos backups

### Auditoria
- ✅ Todas as operações são logadas
- ✅ Rastreamento de quem criou/restaurou/excluiu
- ✅ Integração com sistema de auditoria existente

## ⚠️ Considerações Importantes

### Backup
- Backups são criados com `pg_dump --clean --create --if-exists`
- Contém estrutura completa e dados
- Nomes únicos com timestamp e UUID
- Tamanho varia conforme volume de dados

### Restauração
- **ATENÇÃO**: Operação substitui TODOS os dados atuais
- Requer confirmação explícita do usuário
- Pode levar alguns minutos em bancos grandes
- Conexões ativas podem ser afetadas

### Armazenamento
- Diretório padrão: `/var/backups/bgpcontrol/`
- Monitoramento de espaço disponível
- Limpeza automática configurável
- Backup manual recomendado antes de restaurações

## 🧪 Testes

### Teste Básico
```bash
cd /opt/bgpcontrol/backend
source .venv/bin/activate
python3 test_backup.py
```

### Teste Manual
1. Criar um backup via interface
2. Verificar arquivo em `/var/backups/bgpcontrol/`
3. Testar download do arquivo
4. Opcional: Testar restauração em ambiente de teste

## 🔧 Troubleshooting

### Erro: "pg_dump: command not found"
```bash
sudo apt install postgresql-client-14
```

### Erro: "Permission denied"
```bash
sudo chown -R bgpcontrol:bgpcontrol /var/backups/bgpcontrol
sudo chmod 755 /var/backups/bgpcontrol
```

### Erro: "Database connection failed"
Verificar variáveis de ambiente e conectividade:
```bash
psql -h localhost -U bgpcontrol -d bgpcontrol -c "SELECT version();"
```

### Interface não aparece
Verificar se usuário tem perfil "Administrador":
```sql
SELECT username, profile FROM users WHERE username = 'seu_usuario';
```

## 📈 Monitoramento

### Métricas Disponíveis
- Total de backups armazenados
- Espaço usado pelos backups
- Espaço disponível no disco
- Data do backup mais antigo/recente

### Logs
- Criação de backups: logs de sucesso/erro
- Restaurações: registradas com usuário responsável
- Exclusões: auditadas automaticamente

## 🔄 Manutenção

### Backup Automático
Para automatizar backups, configure um cron job:
```bash
# Exemplo: backup diário às 02:00
0 2 * * * curl -X POST -H "Authorization: Bearer $JWT_TOKEN" http://localhost:8000/api/database-backup/create
```

### Limpeza Automática
Configure limpeza periódica via cron:
```bash
# Exemplo: limpeza semanal mantendo 30 dias
0 3 * * 0 curl -X POST -H "Authorization: Bearer $JWT_TOKEN" http://localhost:8000/api/database-backup/cleanup?days_to_keep=30
```

---

## 🏷️ Versão e Compatibilidade

- **Versão BGPControl**: 1.0+
- **PostgreSQL**: 12+
- **Python**: 3.11+
- **Node.js**: 18+
- **Navegadores**: Chrome 90+, Firefox 88+, Safari 14+

---

**✅ Sistema implementado e testado com sucesso!**
