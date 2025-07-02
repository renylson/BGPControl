import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditarPeering from '../pages/cadastro/EditarPeering';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api/axios';

jest.mock('../api/axios');

describe('Edição de Peering', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('carrega dados e edita peering com sucesso', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { name: 'peer1', ip: '192.0.2.1', asn: '65001', description: 'desc' } });
    (api.put as jest.Mock).mockResolvedValueOnce({});
    render(
      <MemoryRouter initialEntries={["/cadastro/peerings/1"]}>
        <Routes>
          <Route path="/cadastro/peerings/:id" element={<EditarPeering />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByDisplayValue('peer1')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/descri/i), { target: { value: 'desc editada' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/peerings/1', expect.objectContaining({ description: 'desc editada' }));
      expect(screen.getByText(/peering atualizado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('exibe erro ao editar peering', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { name: 'peer1', ip: '192.0.2.1', asn: '65001', description: 'desc' } });
    (api.put as jest.Mock).mockRejectedValueOnce({ response: { data: { detail: 'IP já cadastrado' } } });
    render(
      <MemoryRouter initialEntries={["/cadastro/peerings/1"]}>
        <Routes>
          <Route path="/cadastro/peerings/:id" element={<EditarPeering />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByDisplayValue('peer1')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/descri/i), { target: { value: 'desc editada' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => {
      expect(screen.getByText(/ip já cadastrado/i)).toBeInTheDocument();
    });
  });
});
