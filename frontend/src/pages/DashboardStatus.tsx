import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress } from '@mui/material';
// Removido Grid do MUI, usaremos Box com display: grid
import api from '../api/axios';

export default function DashboardStatus() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard/status/')
      .then(res => setStats(res.data))
      .catch(() => setError('Erro ao carregar status do sistema.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ mt: 8, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Typography color="error" sx={{ mt: 8, textAlign: 'center' }}>{error}</Typography>;
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)' }}>
      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mt: 4 }}>
        <Typography variant="h4" color="primary" align="center" gutterBottom fontWeight={700}>
          Dashboard de Status
        </Typography>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 4,
          mt: 4
        }}>
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'white', borderRadius: 3, boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.10)', width: { xs: '100%', sm: 320 } }}>
            <Typography variant="h6" color="text.secondary">Roteadores</Typography>
            <Typography variant="h3" color="primary.main" fontWeight={700}>{stats?.routers?.total ?? '-'}</Typography>
            <Chip label={`Ativos: ${stats?.routers?.active ?? '-'}`} color="success" sx={{ mt: 2, fontWeight: 600 }} />
          </Paper>
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'white', borderRadius: 3, boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.10)', width: { xs: '100%', sm: 320 } }}>
            <Typography variant="h6" color="text.secondary">Peerings</Typography>
            <Typography variant="h3" color="primary.main" fontWeight={700}>{stats?.peerings?.total ?? '-'}</Typography>
            <Chip label={`Ativos: ${stats?.peerings?.active ?? '-'}`} color="success" sx={{ mt: 2, fontWeight: 600 }} />
          </Paper>
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'white', borderRadius: 3, boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.10)', width: { xs: '100%', sm: 320 } }}>
            <Typography variant="h6" color="text.secondary">Sessões BGP</Typography>
            <Typography variant="h3" color="primary.main" fontWeight={700}>{stats?.sessions?.total ?? '-'}</Typography>
            <Chip label={`Ativas: ${stats?.sessions?.up ?? '-'}`} color="success" sx={{ mt: 2, fontWeight: 600 }} />
            <Chip label={`Inativas: ${stats?.sessions?.down ?? '-'}`} color="default" sx={{ mt: 2, ml: 1, fontWeight: 600 }} />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
