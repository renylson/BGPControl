import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditarRouter from '../pages/cadastro/EditarRouter';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api/axios';

jest.mock('../api/axios');

describe('Edição de Roteador', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('carrega dados e edita roteador com sucesso', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { hostname: 'router1', ip: '10.0.0.1', vendor: 'Cisco', model: 'ASR' } });
    (api.put as jest.Mock).mockResolvedValueOnce({});
    render(
      <MemoryRouter initialEntries={["/cadastro/routers/1"]}>
        <Routes>
          <Route path="/cadastro/routers/:id" element={<EditarRouter />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByDisplayValue('router1')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'ASR9000' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/routers/1', expect.objectContaining({ model: 'ASR9000' }));
      expect(screen.getByText(/roteador atualizado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('exibe erro ao editar roteador', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { hostname: 'router1', ip: '10.0.0.1', vendor: 'Cisco', model: 'ASR' } });
    (api.put as jest.Mock).mockRejectedValueOnce({ response: { data: { detail: 'IP já cadastrado' } } });
    render(
      <MemoryRouter initialEntries={["/cadastro/routers/1"]}>
        <Routes>
          <Route path="/cadastro/routers/:id" element={<EditarRouter />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByDisplayValue('router1')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'ASR9000' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => {
      expect(screen.getByText(/ip já cadastrado/i)).toBeInTheDocument();
    });
  });
});
