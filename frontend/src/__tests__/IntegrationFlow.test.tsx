import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../pages/Login';
import CadastroPeerings from '../pages/cadastro/Peerings';
import Operacao from '../pages/Operacao';
import { BrowserRouter } from 'react-router-dom';
import api from '../api/axios';
import { AuthProvider } from '../context/AuthContext';

jest.mock('../api/axios');

describe('Fluxo de integração ponta-a-ponta', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('login, cadastro de peering e operação BGP', async () => {
    // Mock login
    (api.post as jest.Mock).mockImplementation((url) => {
      if (url === '/users/login') return Promise.resolve({ data: { access_token: 'token' } });
      if (url === '/peerings') return Promise.resolve({});
      if (url.startsWith('/bgp/sessions/1/up')) return Promise.resolve({});
      return Promise.resolve({});
    });
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === '/bgp/sessions') return Promise.resolve({ data: [{ id: 1, peer: 'peer1', router: 'router1', status: 'down' }] });
      return Promise.resolve({ data: [] });
    });

    // Login
    render(
      <AuthProvider>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthProvider>
    );
    fireEvent.change(screen.getByLabelText(/usuário/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    // Aceita qualquer chamada para /users/login, independente dos argumentos
    await waitFor(() => {
      const calls = (api.post as jest.Mock).mock.calls;
      expect(calls.some(call => call[0] === '/users/login')).toBe(true);
    });

    // Cadastro de peering
    render(
      <AuthProvider>
        <BrowserRouter>
          <CadastroPeerings />
        </BrowserRouter>
      </AuthProvider>
    );
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'peer1' } });
    fireEvent.change(screen.getByLabelText(/^ip$/i), { target: { value: '192.0.2.1' } });
    fireEvent.change(screen.getByLabelText(/asn/i), { target: { value: '65001' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/peerings', expect.objectContaining({ name: 'peer1', ip: '192.0.2.1', asn: '65001' })));

    // Operação BGP
    render(
      <AuthProvider>
        <BrowserRouter>
          <Operacao />
        </BrowserRouter>
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText('peer1')).toBeInTheDocument());
    const ativarBtn = screen.getByTestId('ativar-sessao-1');
    fireEvent.click(ativarBtn);
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/bgp/sessions/1/up'));
  });
});
