import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ListaRouters from '../pages/cadastro/ListaRouters';
import { BrowserRouter } from 'react-router-dom';
import api from '../api/axios';

jest.mock('../api/axios');

describe('CRUD de Roteadores', () => {
  const routers = [
    { id: 1, hostname: 'router1', ip: '10.0.0.1', vendor: 'Cisco' },
    { id: 2, hostname: 'router2', ip: '10.0.0.2', vendor: 'Juniper' },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lista roteadores', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: routers });
    render(
      <BrowserRouter>
        <ListaRouters />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('router1')).toBeInTheDocument();
      expect(screen.getByText('router2')).toBeInTheDocument();
    });
  });

  it('exibe erro ao falhar carregamento', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    render(
      <BrowserRouter>
        <ListaRouters />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar roteadores/i)).toBeInTheDocument();
    });
  });

  it('abre modal de remoção ao clicar no botão de deletar', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: routers });
    render(
      <BrowserRouter>
        <ListaRouters />
      </BrowserRouter>
    );
    await waitFor(() => expect(screen.getByText('router1')).toBeInTheDocument());
    const deleteButtons = screen.getAllByTestId('delete-router-btn');
    fireEvent.click(deleteButtons[0]);
    expect(await screen.findByText(/remover roteador/i)).toBeInTheDocument();
    expect(screen.getByText(/tem certeza que deseja remover o roteador/i)).toBeInTheDocument();
  });
});
