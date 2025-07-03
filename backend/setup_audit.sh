#!/bin/bash

# Script para criar a tabela de auditoria
# Este script deve ser executado apenas uma vez

echo "Criando tabela de auditoria..."

# Verificar se o arquivo config.env existe
if [ ! -f "config.env" ]; then
    echo "Erro: Arquivo config.env não encontrado!"
    echo "Execute o script de instalação primeiro."
    exit 1
fi

# Carregar configurações do banco
source config.env

# Executar script SQL
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f create_audit_table.sql

if [ $? -eq 0 ]; then
    echo "Tabela de auditoria criada com sucesso!"
else
    echo "Erro ao criar tabela de auditoria!"
    exit 1
fi
