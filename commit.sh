#!/bin/bash

# Script para fazer commit das alterações do BGPView

echo "🚀 Preparando commit das alterações do BGPView..."

# Verificar se estamos em um repositório Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Erro: Não está em um repositório Git"
    exit 1
fi

# Adicionar todos os arquivos
echo "📁 Adicionando arquivos..."
git add .

# Mostrar status
echo "📋 Status atual:"
git status --short

# Confirmar commit
echo ""
read -p "🤔 Deseja continuar com o commit? (s/N): " confirm
if [[ ! $confirm =~ ^[SsYy]$ ]]; then
    echo "❌ Commit cancelado"
    exit 0
fi

# Fazer commit
echo "💾 Fazendo commit..."
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

if [[ $? -eq 0 ]]; then
    echo "✅ Commit realizado com sucesso!"
    
    # Perguntar sobre push
    echo ""
    read -p "🌐 Deseja fazer push para o repositório remoto? (s/N): " push_confirm
    if [[ $push_confirm =~ ^[SsYy]$ ]]; then
        echo "📤 Fazendo push..."
        
        # Verificar branch atual
        current_branch=$(git branch --show-current)
        echo "📍 Branch atual: $current_branch"
        
        # Fazer push
        git push origin $current_branch
        
        if [[ $? -eq 0 ]]; then
            echo "🎉 Push realizado com sucesso!"
            echo "🔗 Alterações enviadas para o repositório remoto"
        else
            echo "❌ Erro no push. Verifique suas credenciais e conexão."
        fi
    else
        echo "ℹ️  Commit local realizado. Use 'git push' quando quiser enviar para o remoto."
    fi
else
    echo "❌ Erro no commit"
    exit 1
fi

echo ""
echo "📊 Resumo final:"
git log --oneline -3
