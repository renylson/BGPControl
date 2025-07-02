import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/DataTable';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { Dialog } from '@mui/material';
import api from '../../api/axios';
// import { Link } from 'react-router-dom';
import ModalCadastroUsuario from './ModalCadastroUsuario';
import ModalEditarUsuario from './ModalEditarUsuario';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LoadingCenter from '../../components/LoadingCenter';

// Definido sem renderCell, para ser usado em columnsWithActions
const columns = [
  { id: 'username', label: 'Usuário', minWidth: 100 },
  { id: 'name', label: 'Nome Completo', minWidth: 120 },
  { id: 'profile', label: 'Perfil', minWidth: 100 },
  { id: 'is_active', label: 'Ativo', minWidth: 60, format: (value: boolean) => value ? 'Sim' : 'Não' },
  {
    id: 'actions',
    label: 'Ações',
    minWidth: 120,
    align: 'center' as const,
  },
];


export default function ListaUsuarios() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openCadastro, setOpenCadastro] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    api.get('/users')
      .then(res => setRows(res.data))
      .catch(() => setError('Erro ao carregar usuários.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    setDeletingId(id);
    try {
      if (!id || isNaN(Number(id))) {
        setError('ID de usuário inválido para exclusão.');
        setDeletingId(null);
        return;
      }
      // Garante que o id é um número inteiro
      const userId = Number(id);
      if (!Number.isInteger(userId) || userId <= 0) {
        setError('ID de usuário inválido para exclusão.');
        setDeletingId(null);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Sessão expirada. Faça login novamente.');
        setDeletingId(null);
        return;
      }
      const response = await api.delete(`/users/${userId}`);
      if (response.status === 200 || response.status === 204) {
        setRows(rows => rows.filter(u => u.id !== userId));
      } else {
        setError(`Erro ao excluir usuário. Código: ${response.status}`);
      }
    } catch (err: any) {
      if (err.response) {
        if (err.response.status === 401 || err.response.status === 422) {
          setError('Sessão expirada ou inválida. Faça login novamente.');
          setTimeout(() => window.location.href = '/login', 1500);
        } else {
          setError(`Erro ao excluir usuário: ${err.response.status} - ${err.response.data?.detail || err.response.statusText}`);
        }
      } else {
        setError('Erro ao excluir usuário.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Passa handleDelete para renderCell via closure
  // Corrige escopo do handleDelete para uso em renderCell
  const columnsWithActions = columns.map(col =>
    col.id === 'actions'
      ? { ...col, renderCell: (row: any) => {
          const isSelf = Boolean(user && (user === row.username || user === row.email || user === row.id?.toString()));
          const onDelete = () => handleDelete(row.id);
          return (
            <>
              <IconButton
                color="primary"
                size="small"
                onClick={() => setEditId(row.id)}
                sx={{ mr: 1 }}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                color="error"
                size="small"
                onClick={onDelete}
                disabled={deletingId === row.id || isSelf}
                title={isSelf ? 'Você não pode excluir seu próprio usuário.' : ''}
              >
                {deletingId === row.id ? <DeleteIcon sx={{ opacity: 0.5 }} /> : <DeleteIcon />}
              </IconButton>
            </>
          );
        } }
      : col
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" color="primary" fontWeight={800}>Usuários</Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ fontWeight: 700, borderRadius: 2, px: 3, py: 1, fontSize: 18, boxShadow: '0 2px 8px 0 rgba(31,38,135,0.10)' }}
          onClick={() => setOpenCadastro(true)}
        >
          Novo Usuário
        </Button>
      </Box>
      {error && <Typography color="error" sx={{ mb: 2, fontWeight: 600 }}>{error}</Typography>}
      <Box sx={{ height: 4 }} />
      <DataTable columns={columnsWithActions} rows={rows} />
      {loading && <LoadingCenter />}
      <Dialog open={openCadastro} onClose={() => setOpenCadastro(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 2 }}>
          <ModalCadastroUsuario open={openCadastro} onClose={() => setOpenCadastro(false)} onSuccess={() => { setOpenCadastro(false); setLoading(true); api.get('/users').then(res => setRows(res.data)).finally(() => setLoading(false)); }} />
        </Box>
      </Dialog>
      {editId !== null && (
        <ModalEditarUsuario open={!!editId} id={editId} onClose={() => setEditId(null)} onSuccess={() => { setEditId(null); setLoading(true); api.get('/users').then(res => setRows(res.data)).finally(() => setLoading(false)); }} />
      )}
    </Box>
  );
}
