import { useEffect, useState } from 'react';
import { getDashboardSummary } from '../api/dashboard';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import RouterIcon from '@mui/icons-material/Router';
import GroupIcon from '@mui/icons-material/Group';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LanIcon from '@mui/icons-material/Lan';
import LanOutlinedIcon from '@mui/icons-material/LanOutlined';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getDashboardSummary()
      .then(setStats)
      .catch(() => console.error('Erro ao carregar dados do dashboard.'));
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', p: 0, m: 0, background: 'linear-gradient(135deg, #181c24 0%, #232a36 100%)' }}>
      <Typography variant="h4" color="primary" fontWeight={800} align="center" sx={{ mb: 0, mt: 0, letterSpacing: 1, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        Dashboard
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, m: 0 }}>
        <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', mt: 0, mb: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', m: 0 }}>
            {/* Primeira linha: Roteadores, Peerings, Grupo de Peerings */}
            <Paper elevation={10} sx={{ p: 2, borderRadius: 3, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', textAlign: 'center', boxShadow: '0 4px 16px 0 rgba(31,38,135,0.12)', minWidth: 120, width: { xs: '100%', sm: 140 } }}>
              <RouterIcon sx={{ fontSize: 30, color: '#fff', mb: 1 }} />
              <Typography variant="h5" color="#fff" fontWeight={800} sx={{ fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>{stats?.routers?.total ?? '-'}</Typography>
              <Typography variant="subtitle1" color="#e3f2fd" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Roteadores</Typography>
            </Paper>
            <Paper elevation={10} sx={{ p: 2, borderRadius: 3, background: 'linear-gradient(135deg, #9c27b0 0%, #ce93d8 100%)', textAlign: 'center', boxShadow: '0 4px 16px 0 rgba(31,38,135,0.12)', minWidth: 120, width: { xs: '100%', sm: 140 } }}>
              <SwapHorizIcon sx={{ fontSize: 30, color: '#fff', mb: 1 }} />
              <Typography variant="h5" color="#fff" fontWeight={800} sx={{ fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>{stats?.peerings?.total ?? '-'}</Typography>
              <Typography variant="subtitle1" color="#f3e5f5" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Peerings</Typography>
            </Paper>
            <Paper elevation={10} sx={{ p: 2, borderRadius: 3, background: 'linear-gradient(135deg, #263238 0%, #90a4ae 100%)', textAlign: 'center', boxShadow: '0 4px 16px 0 rgba(31,38,135,0.12)', minWidth: 120, width: { xs: '100%', sm: 140 } }}>
              <GroupIcon sx={{ fontSize: 30, color: '#fff', mb: 1 }} />
              <Typography variant="h5" color="#fff" fontWeight={800} sx={{ fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>{stats?.groups?.total ?? '-'}</Typography>
              <Typography variant="subtitle1" color="#cfd8dc" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Grupos de Peerings</Typography>
            </Paper>
          </Box>
          {/* Segunda linha: Peerings IPv4 e Peerings IPv6 */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', m: 0, mt: 2 }}>
            <Paper elevation={10} sx={{ p: 2, borderRadius: 3, background: 'linear-gradient(135deg, #43a047 0%, #a5d6a7 100%)', textAlign: 'center', boxShadow: '0 4px 16px 0 rgba(31,38,135,0.12)', minWidth: 120, width: { xs: '100%', sm: 140 } }}>
              <LanIcon sx={{ fontSize: 30, color: '#fff', mb: 1 }} />
              <Typography variant="h5" color="#fff" fontWeight={800} sx={{ fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>{stats?.peerings?.ipv4 ?? '-'}</Typography>
              <Typography variant="subtitle1" color="#e8f5e9" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Peerings IPv4</Typography>
            </Paper>
            <Paper elevation={10} sx={{ p: 2, borderRadius: 3, background: 'linear-gradient(135deg, #0288d1 0%, #b3e5fc 100%)', textAlign: 'center', boxShadow: '0 4px 16px 0 rgba(31,38,135,0.12)', minWidth: 120, width: { xs: '100%', sm: 140 } }}>
              <LanOutlinedIcon sx={{ fontSize: 30, color: '#fff', mb: 1 }} />
              <Typography variant="h5" color="#fff" fontWeight={800} sx={{ fontSize: { xs: '1.2rem', sm: '1.4rem' } }}>{stats?.peerings?.ipv6 ?? '-'}</Typography>
              <Typography variant="subtitle1" color="#e1f5fe" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Peerings IPv6</Typography>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
