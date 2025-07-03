import { useEffect, useState } from 'react';
import DataTable from '../../components/DataTable';
import { Box, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert } from '@mui/material';
import CadastroPeerings from './Peerings';
import api from '../../api/axios';
// import { Link } from 'react-router-dom';
import ModalEditarPeering from './ModalEditarPeering';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoadingCenter from '../../components/LoadingCenter';
import PageLayout from '../../components/PageLayout';
import StyledCard from '../../components/StyledCard';

const columns = [
  { id: 'name', label: 'Nome', minWidth: 120 },
  { id: 'ip', label: 'IP', minWidth: 120 },
  { id: 'type', label: 'Tipo', minWidth: 80 },
  { id: 'remote_asn', label: 'ASN Remoto', minWidth: 100 },
  { id: 'remote_asn_name', label: 'Nome ASN Remoto', minWidth: 140 },
  {
    id: 'actions',
    label: 'Ações',
    minWidth: 80,
    format: (_: any, row: any) => <ActionsCell row={row} />,
  },
];

function ActionsCell({ row }: { row: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openEdit, setOpenEdit] = useState(false);
  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await api.delete(`/peerings/${row.id}`);
      window.location.reload();
    } catch {
      setError('Erro ao remover.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };
  return (
    <>
      <IconButton color="primary" size="small" onClick={() => setOpenEdit(true)}>
        <EditIcon />
      </IconButton>
      <ModalEditarPeering
        id={row.id}
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        onSuccess={() => setOpenEdit(false)}
      />
      <IconButton color="error" size="small" onClick={() => setOpen(true)}>
        <DeleteIcon />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Remover Peering</DialogTitle>
        <DialogContent>
          <DialogContentText>Tem certeza que deseja remover o peering <b>{row.name}</b>?</DialogContentText>
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

export default function ListaPeerings() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCadastro, setOpenCadastro] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError('');
    api.get('/peerings')
      .then(res => setRows(res.data))
      .catch(() => setError('Erro ao carregar peerings.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const columnsWithActions = columns.map(col =>
    col.id === 'actions'
      ? { ...col, format: (_: any, row: any) => <ActionsCell row={row} /> }
      : col
  );

  return (
    <PageLayout
      title="Peerings"
      subtitle="Gerencie as conexões de peering BGP"
      icon={<SettingsIcon sx={{ fontSize: '2rem' }} />}
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
            Novo Peering
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

      {loading && <LoadingCenter />}
      <Dialog open={openCadastro} onClose={() => setOpenCadastro(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 2 }}>
          <CadastroPeerings
            onSuccess={() => {
              setOpenCadastro(false);
              api.get('/peerings').then(res => setRows(res.data));
            }}
          />
        </Box>
      </Dialog>
    </PageLayout>
  );
}
