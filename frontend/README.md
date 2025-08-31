# BGPControl Frontend - Interface React/TypeScript

**Desenvolvido por:** Renylson Marques  
**E-mail:** renylsonm@gmail.com

Interface web moderna para o sistema BGPControl, desenvolvida com React 19 e TypeScript, demonstrando competências em desenvolvimento frontend moderno, design de componentes e arquitetura de aplicações SPA.

## 🎯 Objetivos Técnicos

Este frontend foi desenvolvido para demonstrar competências em:

- **React Moderno**: Hooks, Context API, Functional Components
- **TypeScript**: Tipagem estática, interfaces, generics
- **Material-UI**: Design system consistente e responsivo
- **Arquitetura Component-Based**: Componentes reutilizáveis e modulares
- **State Management**: Context API e custom hooks
- **Testing**: Jest, Testing Library, mocks
- **Build Tools**: Vite para desenvolvimento rápido e build otimizado

## 🏗️ Arquitetura Frontend

### Estrutura Organizada por Responsabilidade

```
src/
├── components/             # Componentes reutilizáveis
│   ├── common/            # Componentes genéricos (Button, Modal, etc)
│   ├── forms/             # Componentes de formulário
│   └── navigation/        # Componentes de navegação
├── pages/                 # Páginas da aplicação (Views)
│   ├── Dashboard/         # Dashboard principal
│   ├── Routers/          # Gerenciamento de roteadores
│   ├── Peerings/         # Gerenciamento de peerings
│   ├── Users/            # Gerenciamento de usuários
│   └── Auth/             # Páginas de autenticação
├── context/               # Context API para estado global
│   ├── AuthContext.tsx   # Contexto de autenticação
│   └── ThemeContext.tsx  # Contexto de tema
├── services/              # Integração com APIs
│   ├── api.ts            # Cliente HTTP configurado
│   ├── auth.ts           # Serviços de autenticação
│   └── routers.ts        # Serviços de roteadores
├── types/                 # Definições TypeScript
│   ├── auth.ts           # Tipos de autenticação
│   ├── router.ts         # Tipos de roteador
│   └── api.ts            # Tipos de API
├── theme/                 # Customização Material-UI
│   └── index.ts          # Tema personalizado
└── __tests__/            # Testes automatizados
    ├── components/       # Testes de componentes
    └── pages/           # Testes de páginas
```

### Padrões de Design Implementados

1. **Container/Presentational Pattern**: Separação entre lógica e apresentação
2. **Custom Hooks**: Reutilização de lógica entre componentes
3. **Higher-Order Components**: Wrapper para autenticação e permissões
4. **Compound Components**: Componentes complexos modulares

## 🛠️ Stack Tecnológica

### Core Dependencies
```json
{
  "react": "^19.1.0",              // Biblioteca base mais recente
  "react-dom": "^19.1.0",         // DOM renderer
  "typescript": "~5.8.3",         // Tipagem estática
  "@mui/material": "^7.2.0",      // Design system Material-UI
  "@mui/icons-material": "^7.1.2", // Ícones Material Design
  "react-router-dom": "^6.30.1",  // Roteamento SPA
  "axios": "^1.10.0",             // Cliente HTTP
  "recharts": "^3.0.2"            // Gráficos e visualizações
}
```

### Development Dependencies
```json
{
  "vite": "^7.0.0",                    // Build tool moderna
  "jest": "^30.0.3",                   // Framework de testes
  "@testing-library/react": "^16.3.0", // Testes de componentes
  "@testing-library/jest-dom": "^6.6.3", // Matchers customizados
  "eslint": "^9.29.0",                 // Linting de código
  "typescript-eslint": "^8.34.1"       // ESLint para TypeScript
}
```

## 🎨 Design System e UI/UX

### Tema Customizado Material-UI
```typescript
// src/theme/index.ts
export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',      // Azul principal
      dark: '#115293',      // Azul escuro
      light: '#42a5f5',     // Azul claro
    },
    secondary: {
      main: '#dc004e',      // Vermelho secundário
    },
    background: {
      default: '#f5f5f5',   // Fundo padrão
      paper: '#ffffff',     // Fundo de cards
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    // Customizações de componentes
  },
});
```

### Responsividade Implementada
- **Breakpoints**: sm, md, lg, xl
- **Grid System**: Utilização do sistema de grid Material-UI
- **Mobile First**: Design responsivo priorizando mobile

## 🧩 Componentes Principais

### Dashboard Analytics
```typescript
// Exemplo de componente com hooks customizados
const Dashboard: React.FC = () => {
  const { data, loading, error } = useDashboardData();
  const { user } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <StatusCard title="Roteadores" value={data.routers} />
      </Grid>
      {/* Mais componentes */}
    </Grid>
  );
};
```

### Gerenciamento de Estado com Context
```typescript
// src/context/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Implementação do contexto de autenticação
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

## 🧪 Testes Automatizados

### Estratégia de Testes
- **Unit Tests**: Componentes isolados
- **Integration Tests**: Fluxos de usuário
- **Mocking**: APIs e dependências externas

### Exemplo de Teste
```typescript
// src/__tests__/components/RouterCard.test.tsx
describe('RouterCard Component', () => {
  it('should render router information correctly', () => {
    const mockRouter = {
      id: 1,
      name: 'Router Test',
      ip: '192.168.1.1',
      status: 'active'
    };
    
    render(<RouterCard router={mockRouter} />);
    
    expect(screen.getByText('Router Test')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
  });
  
  it('should handle click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<RouterCard router={mockRouter} onClick={handleClick} />);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith(mockRouter.id);
  });
});
```

## 🚀 Scripts e Comandos

### Scripts de Desenvolvimento
```bash
# Desenvolvimento com hot reload
npm run dev

# Build de produção
npm run build

# Preview da build
npm run preview

# Executar testes
npm run test

# Executar testes em watch mode
npm run test:watch

# Linting
npm run lint

# Fix de problemas de lint
npm run lint:fix
```

### Configuração Vite
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
});
```

## 📊 Performance e Otimizações

### Otimizações Implementadas
- **Code Splitting**: Carregamento lazy de rotas
- **Bundle Optimization**: Chunks separados para vendor libraries
- **Memoization**: React.memo para componentes pesados
- **Debounced Inputs**: Evitar calls desnecessárias à API

### Métricas de Performance
- **Bundle Size**: < 500KB gzipped
- **First Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: 90+

## 🔧 Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Backend rodando na porta 8000

### Instalação e Execução

1. **Instale as dependências**
   ```bash
   npm install
   ```

2. **Configure o ambiente**
   ```bash
   # Arquivo .env.local (se necessário)
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Execute em modo desenvolvimento**
   ```bash
   npm run dev
   ```

4. **Acesse a aplicação**
   ```
   http://localhost:3000
   ```

## 📱 Funcionalidades Implementadas

### Autenticação e Autorização
- Login/logout com JWT
- Proteção de rotas
- Controle de permissões por role

### CRUD Completo
- Gerenciamento de roteadores
- Gerenciamento de peerings BGP
- Gerenciamento de usuários
- Grupos de peering

### Dashboard Interativo
- Métricas em tempo real
- Gráficos com Recharts
- Status de sistema

### UX/UI Moderna
- Design responsivo
- Feedback visual
- Loading states
- Error handling

## 📈 Competências Demonstradas

Este projeto frontend demonstra conhecimento em:

- **React Avançado**: Hooks, Context, Performance
- **TypeScript**: Tipagem, Interfaces, Generics
- **Testing**: Jest, Testing Library, TDD
- **Build Tools**: Vite, ESBuild, Rollup
- **State Management**: Context API, Custom Hooks
- **UI/UX**: Material Design, Responsividade
- **Performance**: Code Splitting, Optimization

---

**Desenvolvido como demonstração de competências em frontend development**  
*Focado em código limpo, performance e experiência do usuário*

---

# Conteúdo original do template Vite

Esta template fornece uma configuração mínima para fazer o React funcionar no Vite com HMR e algumas regras do ESLint.

Atualmente, dois plugins oficiais estão disponíveis:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) usa [Babel](https://babeljs.io/) para Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) usa [SWC](https://swc.rs/) para Fast Refresh

## Expandindo a configuração do ESLint

Se você está desenvolvendo uma aplicação para produção, recomendamos atualizar a configuração para habilitar regras de lint baseadas em tipo:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Outras configs...

      // Remova tseslint.configs.recommended e substitua por isso
      ...tseslint.configs.recommendedTypeChecked,
      // Alternativamente, use isso para regras mais rigorosas
      ...tseslint.configs.strictTypeChecked,
      // Opcionalmente, adicione isso para regras estilísticas
      ...tseslint.configs.stylisticTypeChecked,

      // Outras configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // outras opções...
    },
  },
])
```

Você também pode instalar [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) e [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) para regras de lint específicas do React:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Outras configs...
      // Habilita regras de lint para React
      reactX.configs['recommended-typescript'],
      // Habilita regras de lint para React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // outras opções...
    },
  },
])
```
