import { useEffect, useState } from 'react';
import { Box, Typography, Chip, CircularProgress, IconButton, Alert } from '@mui/material';
import { Refresh as RefreshIcon, Dashboard as DashboardIcon } from '@mui/icons-material';
import api from '../api/axios';
import PageLayout from '../components/PageLayout';
import StyledCard from '../components/StyledCard';

export default function DashboardStatus() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = () => {
    setLoading(true);
    setError('');
    api.get('/dashboard/status/')
      .then(res => setStats(res.data))
      .catch(() => setError('Erro ao carregar status do sistema.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <PageLayout
      title="Dashboard de Status"
      subtitle="Monitore o status dos componentes do sistema em tempo real"
      icon={<DashboardIcon sx={{ fontSize: '2rem' }} />}
      actions={
        <IconButton 
          onClick={loadStats} 
          disabled={loading}
          sx={{ 
            color: '#1976d2',
            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
          }}
        >
          <RefreshIcon />
        </IconButton>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 300px' }}>
            <StyledCard>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#b0b8c1', mb: 1 }}>
                  Roteadores
                </Typography>
                <Typography variant="h3" sx={{ color: '#1976d2', fontWeight: 700, mb: 2 }}>
                  {stats?.routers?.total ?? '-'}
                </Typography>
                <Chip 
                  label={`Ativos: ${stats?.routers?.active ?? '-'}`} 
                  color="success" 
                  sx={{ fontWeight: 600 }} 
                />
              </Box>
            </StyledCard>
          </Box>
          
          <Box sx={{ flex: '1 1 300px' }}>
            <StyledCard>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#b0b8c1', mb: 1 }}>
                  Peerings
                </Typography>
                <Typography variant="h3" sx={{ color: '#1976d2', fontWeight: 700, mb: 2 }}>
                  {stats?.peerings?.total ?? '-'}
                </Typography>
                <Chip 
                  label={`Ativos: ${stats?.peerings?.active ?? '-'}`} 
                  color="success" 
                  sx={{ fontWeight: 600 }} 
                />
              </Box>
            </StyledCard>
          </Box>
          
          <Box sx={{ flex: '1 1 300px' }}>
            <StyledCard>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#b0b8c1', mb: 1 }}>
                  Sessões BGP
                </Typography>
                <Typography variant="h3" sx={{ color: '#1976d2', fontWeight: 700, mb: 2 }}>
                  {stats?.sessions?.total ?? '-'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Chip 
                    label={`Ativas: ${stats?.sessions?.up ?? '-'}`} 
                    color="success" 
                    sx={{ fontWeight: 600 }} 
                  />
                  <Chip 
                    label={`Inativas: ${stats?.sessions?.down ?? '-'}`} 
                    color="default" 
                    sx={{ fontWeight: 600 }} 
                  />
                </Box>
              </Box>
            </StyledCard>
          </Box>
        </Box>
      )}
    </PageLayout>
  );
}
