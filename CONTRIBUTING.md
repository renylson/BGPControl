# Guia de Contribuição - BGPControl

**Desenvolvido por:** Renylson Marques  
**E-mail:** renylsonm@gmail.com

Obrigado pelo interesse em contribuir com o BGPControl! Este documento fornece diretrizes para contribuições ao projeto, demonstrando práticas profissionais de desenvolvimento colaborativo.

## 🎯 Como Contribuir

### Tipos de Contribuição Bem-vindas

- **🐛 Relatórios de Bugs**: Problemas encontrados na aplicação
- **✨ Novas Funcionalidades**: Sugestões de melhorias e features
- **📚 Documentação**: Melhorias na documentação e exemplos
- **🧪 Testes**: Adição de testes automatizados
- **🎨 UI/UX**: Melhorias na interface e experiência do usuário
- **⚡ Performance**: Otimizações de performance
- **🔒 Segurança**: Correções de vulnerabilidades

## 🚀 Processo de Contribuição

### 1. Preparação do Ambiente

```bash
# 1. Fork o repositório no GitHub

# 2. Clone seu fork
git clone https://github.com/SEU_USUARIO/bgpcontrol.git
cd bgpcontrol

# 3. Adicione o repositório upstream
git remote add upstream https://github.com/renylson/bgpcontrol.git

# 4. Configure o ambiente de desenvolvimento
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Frontend
cd ../frontend
npm install

# 5. Configure as variáveis de ambiente
cp config.env.example config.env
# Edite config.env conforme necessário
```

### 2. Desenvolvimento

```bash
# 1. Sincronize com upstream
git fetch upstream
git checkout main
git merge upstream/main

# 2. Crie uma branch para sua feature
git checkout -b feature/minha-nova-feature
# ou
git checkout -b fix/correcao-bug
# ou
git checkout -b docs/melhoria-documentacao

# 3. Desenvolva sua contribuição
# ... faça suas alterações ...

# 4. Execute os testes
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test

# 5. Execute o linting
# Backend
pylint app/
black app/ --check

# Frontend
npm run lint

# 6. Commit suas alterações
git add .
git commit -m "feat: adiciona nova funcionalidade X"
```

### 3. Submissão

```bash
# 1. Push para seu fork
git push origin feature/minha-nova-feature

# 2. Abra um Pull Request no GitHub
# - Use o template de PR
# - Descreva as mudanças claramente
# - Referencie issues relacionadas
# - Adicione screenshots se aplicável
```

## 📝 Padrões de Código

### Backend (Python)

#### Estilo de Código
```python
# Use Black para formatação automática
black app/ --line-length 88

# Use isort para organizar imports
isort app/ --profile black

# Use pylint para análise estática
pylint app/ --load-plugins pylint_django
```

#### Convenções
```python
# Classes: PascalCase
class UserService:
    pass

# Funções/Métodos: snake_case
def create_user():
    pass

# Constantes: UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3

# Variáveis: snake_case
user_name = "example"

# Arquivos: snake_case
user_service.py
```

#### Docstrings
```python
def create_user(user_data: UserCreate, current_user: User) -> User:
    """Create a new user in the system.
    
    Args:
        user_data: User information to create
        current_user: User making the request (must be admin)
        
    Returns:
        Created user instance
        
    Raises:
        PermissionError: If current_user is not admin
        ValueError: If user already exists
        
    Example:
        >>> user_data = UserCreate(name="John", email="john@example.com")
        >>> user = create_user(user_data, admin_user)
        >>> print(user.name)
        "John"
    """
```

### Frontend (TypeScript/React)

#### Estilo de Código
```bash
# Use Prettier para formatação
npm run format

# Use ESLint para análise
npm run lint
```

#### Convenções
```typescript
// Componentes: PascalCase
const UserCard: React.FC<UserCardProps> = () => {};

// Funções: camelCase
const handleUserClick = () => {};

// Interfaces: PascalCase
interface User {
  id: number;
  name: string;
}

// Types: PascalCase
type UserRole = 'admin' | 'operator' | 'viewer';

// Arquivos: PascalCase para componentes, camelCase para utilitários
UserCard.tsx
apiService.ts
```

#### Estrutura de Componentes
```typescript
// UserCard.tsx
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  className
}) => {
  const handleEditClick = () => {
    onEdit?.(user);
  };

  return (
    <Card className={className}>
      <CardContent>
        <Typography variant="h6">{user.name}</Typography>
        <Typography color="text.secondary">{user.email}</Typography>
      </CardContent>
    </Card>
  );
};
```

## 🧪 Testes

### Backend Testing
```python
# Estrutura de testes
tests/
├── conftest.py           # Configurações pytest
├── test_models/          # Testes de modelos
├── test_services/        # Testes de serviços
├── test_routers/         # Testes de endpoints
└── factories/            # Factory patterns para dados de teste

# Exemplo de teste
import pytest
from app.services.user_service import UserService

@pytest.mark.asyncio
async def test_create_user_success(user_service, admin_user):
    user_data = UserCreate(
        name="Test User",
        email="test@example.com",
        password="password123"
    )
    
    result = await user_service.create_user(user_data, admin_user)
    
    assert result.name == "Test User"
    assert result.email == "test@example.com"
```

### Frontend Testing
```typescript
// UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from '../UserCard';

const mockUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin' as const
};

describe('UserCard', () => {
  it('renders user information correctly', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
  
  it('calls onEdit when clicked', () => {
    const onEdit = jest.fn();
    
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByText('Editar'));
    
    expect(onEdit).toHaveBeenCalledWith(mockUser);
  });
});
```

## 📋 Template de Pull Request

```markdown
## Descrição

Breve descrição das mudanças implementadas.

## Tipo de Mudança

- [ ] Bug fix (mudança que corrige um problema)
- [ ] Nova funcionalidade (mudança que adiciona funcionalidade)
- [ ] Breaking change (mudança que quebra compatibilidade)
- [ ] Documentação (mudança na documentação)

## Como Testar

1. Configure o ambiente...
2. Execute os comandos...
3. Verifique que...

## Checklist

- [ ] Meu código segue as convenções do projeto
- [ ] Realizei self-review do código
- [ ] Comentei partes complexas do código
- [ ] Fiz mudanças correspondentes na documentação
- [ ] Minhas mudanças não geram novos warnings
- [ ] Adicionei testes que provam que a correção/feature funciona
- [ ] Testes novos e existentes passam com minhas mudanças

## Screenshots (se aplicável)

[Adicione screenshots aqui]

## Issues Relacionadas

Fixes #123
Closes #456
```

## 🐛 Relatório de Bugs

### Template de Issue para Bugs

```markdown
## Descrição do Bug

Descrição clara e concisa do bug.

## Para Reproduzir

Passos para reproduzir o comportamento:
1. Vá para '...'
2. Clique em '....'
3. Role para baixo até '....'
4. Veja o erro

## Comportamento Esperado

Descrição clara do que você esperava que acontecesse.

## Screenshots

Se aplicável, adicione screenshots para ajudar a explicar o problema.

## Informações do Ambiente

- OS: [e.g. Ubuntu 20.04, Windows 10]
- Browser: [e.g. Chrome 91, Firefox 89]
- Versão do BGPControl: [e.g. 1.2.0]

## Contexto Adicional

Qualquer outro contexto sobre o problema.
```

## ✨ Solicitação de Feature

### Template de Issue para Features

```markdown
## Resumo da Feature

Breve descrição da feature solicitada.

## Problema que Resolve

Que problema esta feature resolve? Ex: "Sempre fico frustrado quando [...]"

## Solução Proposta

Descrição clara e concisa do que você quer que aconteça.

## Alternativas Consideradas

Descrição de soluções ou features alternativas que você considerou.

## Contexto Adicional

Qualquer outro contexto ou screenshots sobre a solicitação de feature.
```

## 🔍 Code Review

### Checklist para Reviewers

#### Funcionalidade
- [ ] O código faz o que deveria fazer?
- [ ] A lógica está correta?
- [ ] Casos edge estão tratados?

#### Design e Arquitetura
- [ ] O código segue os padrões do projeto?
- [ ] Há duplicação desnecessária?
- [ ] O código é modular e reutilizável?

#### Legibilidade
- [ ] O código é fácil de entender?
- [ ] Nomes de variáveis/funções são descritivos?
- [ ] Há comentários onde necessário?

#### Performance
- [ ] Há problemas óbvios de performance?
- [ ] Recursos são liberados adequadamente?
- [ ] Queries de banco são otimizadas?

#### Segurança
- [ ] Dados sensíveis estão protegidos?
- [ ] Inputs são validados adequadamente?
- [ ] Há vulnerabilidades óbvias?

#### Testes
- [ ] Há testes adequados?
- [ ] Testes cobrem casos importantes?
- [ ] Testes são confiáveis e rápidos?

## 📞 Suporte

### Canais de Comunicação

- **Issues**: Para bugs e solicitações de features
- **Discussions**: Para perguntas e discussões gerais
- **E-mail**: renylsonm@gmail.com para questões privadas

### Tempo de Resposta

- **Issues**: 2-3 dias úteis
- **Pull Requests**: 3-5 dias úteis
- **E-mail**: 1-2 dias úteis

## 🙏 Reconhecimento

Contribuidores serão reconhecidos no arquivo [CONTRIBUTORS.md](CONTRIBUTORS.md) e releases notes.

## 📄 Licença e Direitos Autorais

Este projeto está sob licença proprietária. Ao contribuir, você concorda que suas contribuições se tornam parte do projeto sob a mesma licença. Para uso comercial ou distribuição, é necessária autorização prévia do autor. Consulte o arquivo [LICENSE](LICENSE) para detalhes completos.

---

**Obrigado por contribuir para o BGPControl!**  
*Cada contribuição, por menor que seja, é valiosa e apreciada.*
