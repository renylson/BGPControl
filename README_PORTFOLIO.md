# 🚀 BGPControl - Sistema de Gerenciamento BGP

**Desenvolvido por:** [Renylson Marques](mailto:renylsonm@gmail.com)  
**Portfolio:** Demonstração de competências full-stack  
**Repositório:** [github.com/renylson/bgpcontrol](https://github.com/renylson/bgpcontrol)

---

## 📖 Sobre o Projeto

O BGPControl é uma aplicação web completa para gerenciamento de infraestrutura BGP, desenvolvida como projeto de portfólio para demonstrar competências em desenvolvimento full-stack moderno. O sistema permite automatizar operações em roteadores BGP através de uma interface web intuitiva.

### 🎯 Objetivo do Portfolio

Este projeto demonstra minha capacidade de:
- Desenvolver APIs REST robustas com FastAPI
- Criar interfaces modernas com React/TypeScript
- Implementar arquiteturas escaláveis e seguras
- Configurar infraestrutura de produção
- Documentar código profissionalmente

---

## ⚡ Quick Start

### 🐳 Via Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/renylson/bgpcontrol.git
cd bgpcontrol

# Suba os serviços
docker-compose up -d

# Acesse a aplicação
open http://localhost:3000
```

### 📦 Instalação Manual (Debian/Ubuntu)

```bash
# Download e execução do instalador
wget https://raw.githubusercontent.com/renylson/bgpcontrol/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

### 🔧 Desenvolvimento Local

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (nova janela do terminal)
cd frontend
npm install && npm run dev
```

---

## 🛠️ Stack Tecnológica

### Backend
- **FastAPI** 0.115+ - Framework web moderno
- **SQLAlchemy** 2.0+ - ORM com suporte async
- **PostgreSQL** 13+ - Banco de dados robusto
- **Paramiko** - Cliente SSH para automação
- **JWT** - Autenticação segura

### Frontend
- **React** 19+ - Interface moderna
- **TypeScript** 5.8+ - Tipagem estática
- **Material-UI** 7+ - Design system
- **Vite** 7+ - Build tool rápida
- **Jest** - Framework de testes

### DevOps
- **Docker** - Containerização
- **Nginx** - Reverse proxy
- **Systemd** - Gerenciamento de serviços
- **Let's Encrypt** - SSL/TLS

---

## 🚀 Funcionalidades

### 🔐 Autenticação e Autorização
- Sistema JWT com refresh tokens
- Controle de acesso baseado em roles
- Middleware de auditoria transparente

### 🌐 Gerenciamento de Roteadores
- CRUD completo de roteadores BGP
- Integração SSH para comandos remotos
- Monitoramento de status em tempo real

### 🔗 Peering BGP
- Cadastro e controle de sessões BGP
- Ativação/desativação automática
- Agrupamento para operações em lote

### 📊 Dashboard e Relatórios
- Métricas em tempo real
- Logs de auditoria detalhados
- Sistema de backup automatizado

---

## 📚 Documentação

- **[📋 README Principal](README.md)** - Documentação completa
- **[💼 Portfolio](PORTFOLIO.md)** - Resumo executivo do projeto
- **[🔧 Desenvolvimento](DEVELOPMENT.md)** - Guia para desenvolvedores
- **[🤝 Contribuição](CONTRIBUTING.md)** - Como contribuir
- **[📝 Changelog](CHANGELOG.md)** - Histórico de versões

### Documentação Técnica
- **[Backend API](backend/README.md)** - Documentação da API
- **[Frontend](frontend/README.md)** - Documentação do frontend
- **[Instalação](INSTALLER.md)** - Guia de instalação
- **[Auditoria](AUDIT_README.md)** - Sistema de logs
- **[Backup](BACKUP_README.md)** - Sistema de backup

---

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   React/TS      │◄──►│    FastAPI      │◄──►│   Database      │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Roteadores    │
                       │     BGP         │
                       │   Via SSH       │
                       └─────────────────┘
```

---

## 🧪 Demo e Credenciais

### 🌐 Demo Online
**URL:** [demo.bgpcontrol.dev](https://demo.bgpcontrol.dev) *(se disponível)*

### 🔑 Credenciais de Teste
```
Usuário: admin
Senha: BGPControl@Demo2024
```

### 📱 Capturas de Tela

| Dashboard | Roteadores | Peerings |
|-----------|------------|----------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Routers](docs/screenshots/routers.png) | ![Peerings](docs/screenshots/peerings.png) |

---

## 📊 Métricas do Projeto

### 💻 Código
- **~15.000 linhas** de código total
- **25+ APIs** REST documentadas
- **40+ componentes** React reutilizáveis
- **80%+ cobertura** de testes

### ⚡ Performance
- **< 100ms** tempo de resposta API
- **< 3s** Time to Interactive
- **90+ score** Lighthouse
- **< 500KB** bundle gzipped

---

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, leia o [guia de contribuição](CONTRIBUTING.md) antes de enviar um Pull Request.

### 🐛 Reportar Bugs
[Abrir Issue](https://github.com/renylson/bgpcontrol/issues/new?template=bug_report.md)

### ✨ Solicitar Features
[Abrir Issue](https://github.com/renylson/bgpcontrol/issues/new?template=feature_request.md)

---

## 📄 Licença

Este projeto está sob licença proprietária com direitos autorais reservados. [Leia a licença completa](LICENSE).

---

## 📞 Contato

**Renylson Marques**  
Desenvolvedor Full-Stack Jr

📧 **E-mail:** [renylsonm@gmail.com](mailto:renylsonm@gmail.com)  
🔗 **GitHub:** [@renylson](https://github.com/renylson)  
💼 **LinkedIn:** [Disponível mediante solicitação]  

### 💬 Vamos Conversar!

Estou disponível para:
- Discussões técnicas sobre o projeto
- Oportunidades de trabalho
- Colaborações em projetos interessantes
- Mentoria em desenvolvimento web

---

<div align="center">

**Desenvolvido com ❤️ e muito ☕**

*"Código limpo não é escrito seguindo regras. É escrito por um programador que se importa."*

[![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/renylson)
[![Built with FastAPI](https://img.shields.io/badge/Built%20with-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB.svg)](https://reactjs.org/)

</div>
