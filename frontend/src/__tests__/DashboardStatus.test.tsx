import { render, screen, waitFor } from '@testing-library/react';
import DashboardStatus from '../pages/DashboardStatus';
import { BrowserRouter } from 'react-router-dom';
import api from '../api/axios';

jest.mock('../api/axios');

const mockStats = {
  routers: { total: 3, active: 2 },
  peerings: { total: 5, active: 4 },
  sessions: { total: 10, up: 8, down: 2 },
};

describe('DashboardStatus', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renderiza cards com dados do dashboard', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: mockStats });
    render(
      <BrowserRouter>
        <DashboardStatus />
      </BrowserRouter>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/dashboard de status/i)).toBeInTheDocument();
      expect(screen.getByText('Roteadores')).toBeInTheDocument();
      expect(screen.getByText('Peerings')).toBeInTheDocument();
      expect(screen.getByText('Sessões BGP')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Ativos: 2')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Ativos: 4')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Ativas: 8')).toBeInTheDocument();
      expect(screen.getByText('Inativas: 2')).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro ao falhar carregamento', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    render(
      <BrowserRouter>
        <DashboardStatus />
      </BrowserRouter>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar status do sistema/i)).toBeInTheDocument();
    });
  });
});
