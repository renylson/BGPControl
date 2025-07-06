import api from '../api/axios';
import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material';
import logo from '../assets/logo.png';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      const res = await api.post('/users/login/', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      
      // Determinar perfil baseado no username (temporário)
      let userProfile = 'Administrador'; // padrão
      if (username === 'operador') {
        userProfile = 'Operador';
      }
      
      login(res.data.access_token, userProfile);
      navigate('/');
    } catch (err: any) {
      setError('Usuário ou senha inválidos');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'linear-gradient(135deg, #181c24 0%, #232a36 100%)' }}>
      <Paper elevation={8} sx={{ p: { xs: 2, sm: 4 }, width: { xs: '100%', sm: 360 }, minWidth: { sm: 360 }, borderRadius: 4, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)', background: 'rgba(35,42,54,0.98)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <img src={logo} alt="Logo" style={{ height: 80, borderRadius: 8, boxShadow: '0 2px 8px 0 rgba(31,38,135,0.10)' }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
            Faça seu login
          </Typography>
        </Box>
        <form onSubmit={handleLogin}>
          <TextField label="Usuário" fullWidth margin="none" value={username} onChange={e => setUsername(e.target.value)} autoFocus 
            sx={{
              bgcolor: '#232a36',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#b0b8c1',
                  borderWidth: '1px',
                },
                '&:hover fieldset': {
                  borderColor: '#1976d2',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1976d2',
                },
              },
            }}
            InputLabelProps={{ style: { color: '#b0b8c1' } }} InputProps={{ style: { color: '#f5f5f5' } }}
          />
          <Box sx={{ height: 10 }} />
          <TextField label="Senha" type="password" fullWidth margin="none" value={password} onChange={e => setPassword(e.target.value)} 
            sx={{
              bgcolor: '#232a36',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#b0b8c1',
                  borderWidth: '1px',
                },
                '&:hover fieldset': {
                  borderColor: '#1976d2',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1976d2',
                },
              },
            }}
            InputLabelProps={{ style: { color: '#b0b8c1' } }} InputProps={{ style: { color: '#f5f5f5' } }}
          />
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3, fontWeight: 600, fontSize: 15, py: 1, borderRadius: 2, boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.10)', minHeight: 36 }}>
            Entrar
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
