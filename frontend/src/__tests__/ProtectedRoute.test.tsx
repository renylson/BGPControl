import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardStatus from '../pages/DashboardStatus';
import Login from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';

// Simula proteção de rota: se não houver token, redireciona para login
type ProtectedRouteProps = { children: React.ReactNode };
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Login />;
}

describe('Navegação protegida', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('nega acesso ao dashboard sem login', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><DashboardStatus /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByText(/login bgpcontrol/i)).toBeInTheDocument();
  });

  it('permite acesso ao dashboard com login', () => {
    localStorage.setItem('token', 'fake-jwt');
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute><DashboardStatus /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    // Não deve renderizar o login
    expect(screen.queryByText(/login bgpcontrol/i)).not.toBeInTheDocument();
  });
});
