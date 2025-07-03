import { useEffect, useState } from 'react';
import DataTable from '../../components/DataTable';
import { Box, Typography, Button, IconButton, DialogTitle, DialogContent, DialogContentText, DialogActions, Dialog, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RouterIcon from '@mui/icons-material/Router';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../../api/axios';
import CadastroRouters from './Routers';
import EditarRouter from './EditarRouter';
import PageLayout from '../../components/PageLayout';
import StyledCard from '../../components/StyledCard';

const columns = [
  { id: 'name', label: 'Nome', minWidth: 120 },
  { id: 'ip', label: 'IP', minWidth: 120 },
  {
    id: 'is_active',
    label: 'Status',
    minWidth: 80,
    format: (value: boolean) => (
      <span style={{ color: value ? '#66bb6a' : '#f44336', fontWeight: 700 }}>
        {value ? 'Ativo' : 'Inativo'}
      </span>
    ),
  },
  {
    id: 'actions',
    label: 'Ações',
    minWidth: 80,
    // format será ajustado dinamicamente
  },
];


function ActionsCell({ row, onEdit }: { row: any, onEdit: (row: any) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await api.delete(`/routers/${row.id}`);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('router-removed', { detail: row.id }));
      }
    } catch {
      setError('Erro ao remover.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };
  return (
    <>
      <IconButton
        color="primary"
        size="small"
        aria-label="Editar roteador"
        data-testid="edit-router-btn"
        onClick={() => onEdit(row)}
      >
        <EditIcon />
      </IconButton>
      <IconButton
        color="error"
        size="small"
        onClick={() => setOpen(true)}
        aria-label="Remover roteador"
        data-testid="delete-router-btn"
      >
        <DeleteIcon />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Remover Roteador</DialogTitle>
        <DialogContent>
          <DialogContentText>Tem certeza que deseja remover o roteador <b>{row.hostname}</b>?</DialogContentText>
          {error && <Typography color="error">{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" disabled={loading}>Remover</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}


export default function ListaRouters() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCadastro, setOpenCadastro] = useState(false);
  const [openEditar, setOpenEditar] = useState<{ open: boolean, row: any | null }>({ open: false, row: null });

  const loadData = () => {
    setLoading(true);
    setError('');
    api.get('/routers/')
      .then(res => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Erro ao carregar roteadores.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Adapta DataTable para passar onEdit corretamente
  const columnsWithActions = columns.map(col =>
    col.id === 'actions'
      ? { ...col, format: (_: any, row: any) => <ActionsCell row={row} onEdit={(row) => setOpenEditar({ open: true, row })} /> }
      : col
  );

  // Atualiza lista ao remover
  useEffect(() => {
    const handler = (e: any) => {
      setRows((prev) => prev.filter((r) => r.id !== e.detail));
    };
    window.addEventListener('router-removed', handler);
    return () => window.removeEventListener('router-removed', handler);
  }, []);

  return (
    <PageLayout
      title="Roteadores"
      subtitle="Gerencie os roteadores do sistema"
      icon={<RouterIcon sx={{ fontSize: '2rem' }} />}
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            onClick={loadData} 
            disabled={loading}
            sx={{ 
              color: '#1976d2',
              '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleIcon />}
            sx={{ fontWeight: 700, borderRadius: 2, px: 3, py: 1 }}
            onClick={() => setOpenCadastro(true)}
          >
            Novo Roteador
          </Button>
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <StyledCard sx={{ p: 0 }}>
        <DataTable columns={columnsWithActions} rows={rows} />
      </StyledCard>
      <Dialog open={openCadastro} onClose={() => setOpenCadastro(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 2 }}>
          <CadastroRouters
            onSuccess={() => {
              setOpenCadastro(false);
              api.get('/routers/').then(res => setRows(Array.isArray(res.data) ? res.data : []));
            }}
            onCancel={() => setOpenCadastro(false)}
          />
        </Box>
      </Dialog>
      <Dialog open={openEditar.open} onClose={() => setOpenEditar({ open: false, row: null })} maxWidth="sm" fullWidth>
        <Box sx={{ p: 2 }}>
          {openEditar.row && <EditarRouter id={openEditar.row.id}
            onSuccess={(updated) => {
              setOpenEditar({ open: false, row: null });
              if (updated && updated.id) {
                setRows((prev) => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
              } else {
                api.get('/routers/').then(res => setRows(Array.isArray(res.data) ? res.data : []));
              }
            }}
            onCancel={() => setOpenEditar({ open: false, row: null })}
          />}
        </Box>
      </Dialog>
    </PageLayout>
  );
}
