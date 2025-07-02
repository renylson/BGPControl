# Comandos Git para Subir as Alterações

## 1. Adicionar todos os arquivos novos e modificados
```bash
git add .
```

## 2. Verificar o que será commitado
```bash
git status
```

## 3. Fazer o commit com mensagem descritiva
```bash
git commit -m "feat: adiciona sistema completo de instalação automatizada

- Adiciona instalador automatizado (install.sh) com modo interativo e não-interativo
- Adiciona desinstalador completo (uninstall.sh)
- Adiciona script de teste da instalação (test-install.sh)
- Adiciona arquivo de configuração exemplo (config.env.example)
- Adiciona documentação detalhada do instalador (INSTALLER.md)
- Atualiza README.md com instruções de instalação rápida
- Suporte para instalação em Debian limpo com uma linha de comando
- Configuração automática de PostgreSQL, Python 3.11, Node.js, Nginx
- Configuração SSL/HTTPS opcional com Let's Encrypt
- Scripts de manutenção (backup, update, status)
- Sistema de segurança com usuário dedicado e firewall
- Validação completa da instalação"
```

## 4. Enviar para o repositório remoto
```bash
git push origin main
```

## Ou comandos alternativos se a branch for diferente:
```bash
# Para verificar a branch atual
git branch

# Para enviar para a branch atual
git push

# Para enviar para uma branch específica (se necessário)
git push origin nome-da-branch
```

## Verificação final
```bash
# Verificar se o push foi bem-sucedido
git log --oneline -5

# Verificar status limpo
git status
```
