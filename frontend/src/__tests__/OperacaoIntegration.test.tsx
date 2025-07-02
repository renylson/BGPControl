import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Operacao from '../pages/Operacao';
import { BrowserRouter } from 'react-router-dom';
import api from '../api/axios';

jest.mock('../api/axios');

describe('Fluxo de integração Operação BGP', () => {
  const sessions = [
    { id: 1, peer: 'peer1', router: 'router1', status: 'down' },
    { id: 2, peer: 'peer2', router: 'router2', status: 'up' },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('login simulado + ativação/desativação de sessão', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: sessions });
    (api.post as jest.Mock).mockResolvedValue({});
    render(
      <BrowserRouter>
        <Operacao />
      </BrowserRouter>
    );
    await waitFor(() => expect(screen.getByText('peer1')).toBeInTheDocument());
    // Ativar sessão 1
    const ativarBtn = screen.getByTestId('ativar-sessao-1');
    fireEvent.click(ativarBtn);
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/bgp/sessions/1/up'));
    // Desativar sessão 2
    const desativarBtn = screen.getByTestId('desativar-sessao-2');
    fireEvent.click(desativarBtn);
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/bgp/sessions/2/down'));
  });
});
