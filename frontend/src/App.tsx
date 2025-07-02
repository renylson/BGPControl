import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MainLayoutWithFooter from './layout/MainLayout';
import PrivateRoute from './components/PrivateRoute';
import { routes } from './routes';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Suspense fallback={<div>Carregando...</div>}>
          <Routes>
            <Route path="/login" element={routes.find(r => r.path === '/login')!.element} />
            <Route element={<PrivateRoute />}> 
              <Route element={<MainLayoutWithFooter />}>
                {routes.filter(r => r.path !== '/login' && r.path !== '*').map(r => (
                  <Route key={r.path} path={r.path} element={r.element} />
                ))}
                {/* Fallback para rotas não encontradas */}
                <Route path="*" element={routes.find(r => r.path === '*')!.element} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
