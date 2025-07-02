import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import CadastroRouters from '../pages/cadastro/Routers';
import { BrowserRouter } from 'react-router-dom';
import api from '../api/axios';
import { AuthProvider } from '../context/AuthContext';

jest.mock('../api/axios');

describe('Cadastro de Roteador', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('preenche e cadastra roteador com sucesso', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({ data: {} });
    render(
      <AuthProvider>
        <BrowserRouter>
          <CadastroRouters />
        </BrowserRouter>
      </AuthProvider>
    );
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'router3' } });
    fireEvent.change(screen.getByLabelText(/ip/i), { target: { value: '10.0.0.3' } });
    fireEvent.change(screen.getByLabelText(/porta ssh/i), { target: { value: '22' } });
    fireEvent.change(screen.getByLabelText(/usuário ssh/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/senha ssh/i), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText(/asn/i), { target: { value: '65001' } });
    fireEvent.change(screen.getByLabelText(/observação/i), { target: { value: 'teste' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/routers', expect.objectContaining({
        name: 'router3',
        ip: '10.0.0.3',
        ssh_port: 22,
        ssh_user: 'admin',
        ssh_password: 'senha123',
        asn: 65001,
        note: 'teste',
      }));
      expect(screen.getByText(/roteador cadastrado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('exibe erro ao cadastrar roteador', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce({ response: { data: { detail: 'IP já cadastrado' } } });
    render(
      <AuthProvider>
        <BrowserRouter>
          <CadastroRouters />
        </BrowserRouter>
      </AuthProvider>
    );
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'router3' } });
    fireEvent.change(screen.getByLabelText(/ip/i), { target: { value: '10.0.0.3' } });
    fireEvent.change(screen.getByLabelText(/porta ssh/i), { target: { value: '22' } });
    fireEvent.change(screen.getByLabelText(/usuário ssh/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/senha ssh/i), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText(/asn/i), { target: { value: '65001' } });
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));
    await waitFor(() => {
      expect(screen.getByText(/ip já cadastrado/i)).toBeInTheDocument();
    });
  });
});
