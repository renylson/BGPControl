import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function LoadingCenter({ message = 'Carregando...' }: { message?: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, width: '100%' }}>
      <CircularProgress color="primary" size={36} sx={{ mb: 2 }} />
      <Typography color="text.secondary" sx={{ fontWeight: 600, fontSize: '1rem' }}>{message}</Typography>
    </Box>
  );
}
