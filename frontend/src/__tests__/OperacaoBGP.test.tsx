import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Operacao from '../pages/Operacao';
import { BrowserRouter } from 'react-router-dom';
import api from '../api/axios';

jest.mock('../api/axios');

describe('Operações de Sessão BGP', () => {
  const sessions = [
    { id: 1, peer: 'peer1', router: 'router1', state: 'down' },
    { id: 2, peer: 'peer2', router: 'router2', state: 'up' },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lista sessões BGP', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: sessions });
    render(
      <BrowserRouter>
        <Operacao />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('peer1')).toBeInTheDocument();
      expect(screen.getByText('peer2')).toBeInTheDocument();
    });
  });

  it('abre modal de ativação/desativação', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: sessions });
    render(
      <BrowserRouter>
        <Operacao />
      </BrowserRouter>
    );
    await waitFor(() => expect(screen.getByText('peer1')).toBeInTheDocument());
    // Busca pelo data-testid do botão de ativar sessão do primeiro peer
    const ativarBtn = screen.getByTestId('ativar-sessao-1');
    fireEvent.click(ativarBtn);
    expect(await screen.findByText(/tem certeza que deseja/i)).toBeInTheDocument();
  });
});
