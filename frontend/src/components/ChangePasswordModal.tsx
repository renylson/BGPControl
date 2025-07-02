import { useState } from 'react';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import axios from '../api/axios';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError('As novas senhas não coincidem.');
      setLoading(false);
      return;
    }
    try {
      await axios.post('/users/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao trocar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Trocar Senha</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Senha alterada com sucesso!</Alert>}
        <TextField
          label="Senha atual"
          type="password"
          fullWidth
          margin="normal"
          value={oldPassword}
          onChange={e => setOldPassword(e.target.value)}
          autoFocus
        />
        <TextField
          label="Nova senha"
          type="password"
          fullWidth
          margin="normal"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />
        <TextField
          label="Confirmar nova senha"
          type="password"
          fullWidth
          margin="normal"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={loading} sx={{ fontSize: 14, minHeight: 36, px: 2, py: 0.5 }}>Cancelar</Button>
        <Button onClick={handleChangePassword} color="primary" variant="contained" disabled={loading} sx={{ fontSize: 14, minHeight: 36, px: 2, py: 0.5 }}>
          Trocar senha
        </Button>
      </DialogActions>
    </Dialog>
  );
}
