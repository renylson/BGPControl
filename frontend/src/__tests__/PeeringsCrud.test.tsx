import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ListaPeerings from '../pages/cadastro/ListaPeerings';
import { BrowserRouter } from 'react-router-dom';
import api from '../api/axios';

jest.mock('../api/axios');

describe('CRUD de Peerings', () => {
  const peerings = [
    { id: 1, name: 'peer1', ip: '192.0.2.1', asn: '65001' },
    { id: 2, name: 'peer2', ip: '192.0.2.2', asn: '65002' },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lista peerings', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: peerings });
    render(
      <BrowserRouter>
        <ListaPeerings />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('peer1')).toBeInTheDocument();
      expect(screen.getByText('peer2')).toBeInTheDocument();
    });
  });

  it('abre modal de remoção', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: peerings });
    render(
      <BrowserRouter>
        <ListaPeerings />
      </BrowserRouter>
    );
    await waitFor(() => expect(screen.getByText('peer1')).toBeInTheDocument());
    // Busca o botão de remover pelo papel de button e cor de erro (ícone de lixeira)
    const deleteBtns = screen.getAllByRole('button').filter(btn => btn.className.includes('MuiIconButton-colorError'));
    fireEvent.click(deleteBtns[0]);
    expect(await screen.findByText(/tem certeza que deseja remover/i)).toBeInTheDocument();
  });
});
