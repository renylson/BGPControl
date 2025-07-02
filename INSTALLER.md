# BGPView - Instalador Automatizado

Este script instala automaticamente o BGPView em um sistema Debian limpo.

## 🚀 Uso Rápido

```bash
# Fazer download do instalador
wget https://raw.githubusercontent.com/renylson/bgpview/main/install.sh

# Dar permissão de execução
chmod +x install.sh

# Executar como root
sudo ./install.sh
```

## 📋 O que o Instalador Faz

### Etapas Automáticas:
1. **Verificação do Sistema** - Confirma compatibilidade com Debian/Ubuntu
2. **Coleta de Configurações** - Interface interativa para personalização
3. **Atualização do Sistema** - Atualiza repositórios e pacotes
4. **Instalação do PostgreSQL** - Instala e configura banco de dados
5. **Instalação do Python 3.11** - Com ambiente virtual e dependências
6. **Instalação do Node.js 18.x** - Para o frontend React
7. **Criação de Usuário** - Usuário de sistema dedicado (`bgpview`)
8. **Download do Projeto** - Clone do repositório GitHub
9. **Configuração do Backend** - Ambiente virtual, dependências, migrações
10. **Configuração do Frontend** - Build de produção otimizado
11. **Serviço Systemd** - Daemon para o backend
12. **Configuração do Nginx** - Proxy reverso e servidor web
13. **SSL/HTTPS** - Let's Encrypt (opcional)
14. **Usuário Admin** - Criação via API
15. **Firewall** - Configuração básica de segurança
16. **Scripts de Manutenção** - Ferramentas para backup e atualização

## ⚙️ Opções de Configuração

### Tipo de Acesso
- **Por IP**: Ideal para desenvolvimento ou redes internas
- **Por Domínio**: Para produção com domínio próprio

### SSL/HTTPS
- Configuração automática com Let's Encrypt
- Renovação automática via cron

### Personalização
- Senhas do banco de dados
- Credenciais do administrador
- Configurações de segurança

## 📁 Estrutura Criada

```
/opt/bgpview/                    # Diretório principal
├── backend/                     # API FastAPI
│   ├── .venv/                  # Ambiente virtual Python
│   ├── .env                    # Configurações
│   └── ...
├── frontend/                    # Interface React
│   ├── dist/                   # Build de produção
│   ├── .env                    # Configurações
│   └── ...
└── README.md

/etc/systemd/system/
└── bgpview-backend.service      # Serviço do backend

/etc/nginx/sites-available/
└── bgpview                      # Configuração Nginx

/usr/local/bin/bgpview/          # Scripts de manutenção
├── backup.sh                   # Script de backup
├── update.sh                   # Script de atualização
└── status.sh                   # Script de status

/var/backups/bgpview/            # Diretório de backups
```

## 🔧 Scripts de Manutenção

### bgpview-status
Mostra status completo do sistema:
```bash
bgpview-status
```

### bgpview-backup
Faz backup completo:
```bash
bgpview-backup
```
- Backup do banco PostgreSQL
- Backup das configurações
- Mantém últimos 7 backups

### bgpview-update
Atualiza para nova versão:
```bash
bgpview-update
```
- Backup automático antes da atualização
- Pull do código mais recente
- Atualização de dependências
- Reinício dos serviços

## 🔐 Segurança

### Configurações Automáticas:
- Usuário de sistema dedicado sem privilégios
- Firewall configurado (UFW)
- Senhas aleatórias geradas automaticamente
- JWT com chave segura
- SSL/HTTPS opcional

### Portas Abertas:
- **80/tcp** - HTTP (sempre)
- **443/tcp** - HTTPS (se SSL habilitado)
- **22/tcp** - SSH (mantido para administração)

## 🗄️ Banco de Dados

- **PostgreSQL** instalado e configurado
- Usuário: `bgpview`
- Banco: `bgpview`
- Senha: gerada automaticamente ou definida pelo usuário

## 🌐 Nginx

### Configuração para IP:
- Serve frontend na porta 80
- Proxy para API em `/api/`
- Documentação em `/docs`

### Configuração para Domínio:
- Virtual host configurado
- SSL automático (Let's Encrypt)
- Cache para arquivos estáticos

## ⚠️ Requisitos

### Sistema Operacional:
- Debian 11+ (Bullseye)
- Ubuntu 20.04+

### Hardware Mínimo:
- **RAM**: 2GB (recomendado 4GB+)
- **Armazenamento**: 10GB livres
- **CPU**: 1 core (recomendado 2+)

### Rede:
- Acesso à internet para downloads
- Portas 80/443 liberadas (se usar domínio)

## 🛠️ Solução de Problemas

### Verificar Logs:
```bash
# Logs do instalador
journalctl -xe

# Logs do backend
journalctl -u bgpview-backend -f

# Logs do Nginx
tail -f /var/log/nginx/error.log
```

### Reinstalação:
Se algo der errado, você pode:
1. Remover o diretório `/opt/bgpview`
2. Parar os serviços: `systemctl stop bgpview-backend nginx`
3. Executar o instalador novamente

### Problemas Comuns:

**Backend não inicia:**
```bash
cd /opt/bgpview/backend
sudo -u bgpview bash -c "source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000"
```

**Erro no banco:**
```bash
sudo systemctl status postgresql
PGPASSWORD="sua_senha" psql -h localhost -U bgpview -d bgpview -c "SELECT version();"
```

**Nginx erro de configuração:**
```bash
nginx -t
systemctl reload nginx
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs mencionados acima
2. Abra uma [Issue no GitHub](https://github.com/renylson/bgpview/issues)
3. Inclua informações do sistema: `uname -a` e `lsb_release -a`

## 🔄 Atualizações

O instalador cria um sistema facilmente atualizável:
```bash
bgpview-update
```

Este comando:
- Faz backup automático
- Baixa atualizações do GitHub
- Atualiza dependências
- Executa migrações do banco
- Reinicia serviços

## 📈 Monitoramento

### Status dos Serviços:
```bash
systemctl status bgpview-backend nginx postgresql
```

### Uso de Recursos:
```bash
htop
df -h
free -h
```

### Conexões de Rede:
```bash
ss -tulpn | grep -E ':(80|443|8000|5432)'
```
