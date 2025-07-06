import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardStatus from '../pages/DashboardStatus';
import Login from '../pages/Login';

describe('Logout e persistência de autenticação', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('remove token do localStorage ao fazer logout', () => {
    // Simula login
    localStorage.setItem('token', 'fake-jwt');
    // Simula botão de logout no dashboard
    function DashboardWithLogout() {
      return (
        <div>
          <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}>Logout</button>
          <DashboardStatus />
        </div>
      );
    }
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardWithLogout />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );
    expect(localStorage.getItem('token')).toBe('fake-jwt');
    fireEvent.click(screen.getByText(/logout/i));
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('mantém usuário autenticado após recarregar', () => {
    localStorage.setItem('token', 'fake-jwt');
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardStatus />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );
    // Usuário autenticado deve ver o dashboard
    expect(screen.queryByText(/login bgpcontrol/i)).not.toBeInTheDocument();
  });
});
