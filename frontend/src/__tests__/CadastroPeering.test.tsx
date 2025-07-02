

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CadastroPeerings from '../pages/cadastro/Peerings';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import * as routersApi from '../api/routers';

jest.mock('../api/axios');
jest.mock('../api/routers');

describe('Cadastro de Peering', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (routersApi.getRouters as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Router Teste' }
    ]);
  });

  it('preenche e cadastra peering com sucesso', async () => {
    const api = require('../api/axios');
    (api.post as jest.Mock).mockResolvedValueOnce({ data: {} });
    render(
      <AuthProvider>
        <BrowserRouter>
          <CadastroPeerings />
        </BrowserRouter>
      </AuthProvider>
    );
    fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'peer1' } });
    fireEvent.change(screen.getByLabelText(/^ip$/i), { target: { value: '192.0.2.1' } });
    fireEvent.change(screen.getByLabelText(/^tipo$/i), { target: { value: 'IPv4' } });
    fireEvent.change(screen.getByLabelText(/asn remoto/i), { target: { value: '65001' } });
    fireEvent.change(screen.getByLabelText(/nome asn remoto/i), { target: { value: 'ASN Teste' } });
    fireEvent.change(screen.getByLabelText(/^roteador$/i), { target: { value: 'Router Teste' } });
    fireEvent.change(screen.getByLabelText(/observa/i), { target: { value: 'Peering de teste' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/peerings/',
        expect.objectContaining({
          name: 'peer1',
          ip: '192.0.2.1',
          type: 'IPv4',
          remote_asn: '65001',
          remote_asn_name: 'ASN Teste',
          router_id: 1,
          note: 'Peering de teste',
        })
      );
      expect(screen.getByText(/peering cadastrado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('exibe erro ao cadastrar peering', async () => {
    const api = require('../api/axios');
    (api.post as jest.Mock).mockRejectedValueOnce({ response: { data: { detail: 'IP já cadastrado' } } });
    render(
      <AuthProvider>
        <BrowserRouter>
          <CadastroPeerings />
        </BrowserRouter>
      </AuthProvider>
    );
    fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: 'peer1' } });
    fireEvent.change(screen.getByLabelText(/^ip$/i), { target: { value: '192.0.2.1' } });
    fireEvent.change(screen.getByLabelText(/^tipo$/i), { target: { value: 'IPv4' } });
    fireEvent.change(screen.getByLabelText(/asn remoto/i), { target: { value: '65001' } });
    fireEvent.change(screen.getByLabelText(/nome asn remoto/i), { target: { value: 'ASN Teste' } });
    fireEvent.change(screen.getByLabelText(/^roteador$/i), { target: { value: 'Router Teste' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => {
      expect(screen.getByText(/ip já cadastrado/i)).toBeInTheDocument();
    });
  });
});
