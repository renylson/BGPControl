import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box, Typography, IconButton } from '@mui/material';
import DataTable from '../../components/DataTable';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export interface IpOrigem {
  id?: number;
  name: string;
  type: 'IPv4' | 'IPv6';
  ip: string;
}

interface ModalIpOrigemProps {
  open: boolean;
  onClose: () => void;
  origens: IpOrigem[];
  onSave: (list: IpOrigem[]) => void;
}

export default function ModalIpOrigem({ open, onClose, origens, onSave }: ModalIpOrigemProps) {
  const [list, setList] = useState<IpOrigem[]>([]);
  const [editing, setEditing] = useState<IpOrigem | null>(null);
  const [form, setForm] = useState<IpOrigem>({ name: '', type: 'IPv4', ip: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    setList(origens);
  }, [origens]);

  const handleEdit = (item: IpOrigem) => {
    setEditing(item);
    setForm(item);
    setError('');
  };

  const handleRemove = (item: IpOrigem) => {
    setList(list.filter(i => i !== item));
  };

  const handleSave = () => {
    if (!form.name || !form.ip) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (editing) {
      setList(list.map(i => (i === editing ? form : i)));
      setEditing(null);
    } else {
      setList([...list, { ...form, id: Date.now() }]);
    }
    setForm({ name: '', type: 'IPv4', ip: '' });
    setError('');
  };

  const handleEditCancel = () => {
    setEditing(null);
    setForm({ name: '', type: 'IPv4', ip: '' });
    setError('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gerenciar IPs de Origem</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <DataTable
            columns={[
              { id: 'name', label: 'Nome', minWidth: 100 },
              { id: 'type', label: 'Tipo', minWidth: 60 },
              { id: 'ip', label: 'IP', minWidth: 120 },
              {
                id: 'actions',
                label: 'Ações',
                minWidth: 80,
                align: 'center',
                format: (_: any, row: IpOrigem) => (
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <IconButton size="small" color="primary" onClick={() => handleEdit(row)} sx={{ p: 0.5, minWidth: 28, minHeight: 28 }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleRemove(row)} sx={{ p: 0.5, minWidth: 28, minHeight: 28 }}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                )
              }
            ]}
            rows={list}
            rowsPerPageOptions={[5, 10]}
            filterPlaceholder="Buscar IP, nome..."
            sx={{ background: '#232a36', color: '#fff' }}
          />
          {list.length === 0 && <Typography color="text.secondary" sx={{ mt: 2 }}>Nenhum IP cadastrado.</Typography>}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            label="Nome"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            size="small"
            sx={{ flex: 2 }}
          />
          <TextField
            select
            label="Tipo"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as 'IPv4' | 'IPv6' }))}
            size="small"
            sx={{ flex: 1, minWidth: 90 }}
          >
            <MenuItem value="IPv4">IPv4</MenuItem>
            <MenuItem value="IPv6">IPv6</MenuItem>
          </TextField>
          <TextField
            label="IP"
            value={form.ip}
            onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
            size="small"
            sx={{ flex: 2 }}
          />
          <Button onClick={handleSave} variant="contained" color="success" size="small"
            sx={{ minWidth: 70, fontWeight: 600, fontSize: 13, py: 0.7, borderRadius: 2 }}>
            {editing ? 'Salvar' : 'Adicionar'}
          </Button>
          {editing && (
            <Button onClick={handleEditCancel} variant="outlined" color="inherit" size="small"
              sx={{ minWidth: 70, fontWeight: 600, fontSize: 13, py: 0.7, borderRadius: 2 }}>
              Cancelar
            </Button>
          )}
        </Box>
        {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2 }}>
        <Button onClick={onClose} color="inherit" size="small"
          sx={{ minWidth: 70, fontWeight: 600, fontSize: 13, py: 0.7, borderRadius: 2 }}>
          Fechar
        </Button>
        <Button onClick={() => onSave(list)} color="primary" variant="contained" size="small"
          sx={{ minWidth: 120, fontWeight: 600, fontSize: 13, py: 0.7, borderRadius: 2 }}>
          Salvar alterações
        </Button>
      </DialogActions>
    </Dialog>
  );
}
