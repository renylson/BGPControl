import { Box, Typography } from '@mui/material';

export default function Footer() {
  return (
    <Box sx={{ mt: 8, mb: 2, textAlign: 'center', width: '100%' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        Desenvolvido por: <b>Renylson Marques</b>{' '}|{' '}
        <a href="https://wa.me/5587988463681" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', fontWeight: 700, color: 'inherit' }}>
          +55 (87) 98846-3681
        </a>{' '}|{' '}
        <a href="https://www.renylson.com.br" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: 'inherit' }}>www.renylson.com.br</a>
      </Typography>
    </Box>
  );
}
