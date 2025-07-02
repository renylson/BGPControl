import { useEffect, useState } from 'react';
import DataTable from '../../components/DataTable';
import { getRouters } from '../../api/routers';
import ModalCadastroGrupo from './ModalCadastroGrupo';
import ModalEditarGrupo from './ModalEditarGrupo';
import { Box, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import api from '../../api/axios';
import { Link } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LoadingCenter from '../../components/LoadingCenter';

function getRouterName(router_id: number, routers: any[]) {
  const router = routers.find((r: any) => r.id === router_id);
  return router ? router.name : router_id;
}

const columns = (routers: any[]) => [
  { id: 'name', label: 'Nome do Grupo', minWidth: 140 },
  { id: 'router_id', label: 'Roteador', minWidth: 120, format: (v: number) => getRouterName(v, routers) },
  { id: 'peering_ids', label: 'Qtd. Peerings', minWidth: 80, format: (v: number[]) => v?.length ?? 0 },
  { id: 'is_active', label: 'Status', minWidth: 80, format: (v: boolean) => v ? 'Ativo' : 'Desativado' },
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
  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await api.delete(`/grupos/${row.id}`);
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
      <IconButton component={Link} to={`/cadastro/grupos/${row.id}`} color="primary" size="small">
        <EditIcon />
      </IconButton>
      <IconButton color="error" size="small" onClick={() => setOpen(true)}>
        <DeleteIcon />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Remover Grupo</DialogTitle>
        <DialogContent>
          <DialogContentText>Tem certeza que deseja remover o grupo <b>{row.name}</b>?</DialogContentText>
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

export default function ListaGrupos() {
  const [rows, setRows] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCadastro, setOpenCadastro] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/peering-groups/').then(res => res.data),
      getRouters()
    ])
      .then(([groups, routers]) => {
        setRows(groups);
        setRouters(routers);
      })
      .catch(() => setError('Erro ao carregar grupos ou roteadores.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columnsWithActions = columns(routers).map(col =>
    col.id === 'actions'
      ? { ...col, format: (_: any, row: any) => <ActionsCell row={row} /> }
      : col
  );

  function ActionsCell({ row }: { row: any }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleDelete = async () => {
      setLoading(true);
      setError('');
      try {
        await api.delete(`/peering-groups/${row.id}/`);
        fetchData();
      } catch {
        setError('Erro ao remover.');
      } finally {
        setLoading(false);
        setOpen(false);
      }
    };
    return (
      <>
        <IconButton color="primary" size="small" onClick={() => setEditId(row.id)}>
          <EditIcon />
        </IconButton>
        <IconButton color="error" size="small" onClick={() => setOpen(true)}>
          <DeleteIcon />
        </IconButton>
        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>Remover Grupo</DialogTitle>
          <DialogContent>
            <DialogContentText>Tem certeza que deseja remover o grupo <b>{row.name}</b>?</DialogContentText>
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

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" color="primary" fontWeight={800}>Grupos de Peerings</Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ fontWeight: 700, borderRadius: 2, px: 3, py: 1, fontSize: 18, boxShadow: '0 2px 8px 0 rgba(31,38,135,0.10)' }}
          onClick={() => setOpenCadastro(true)}
        >
          Novo Grupo
        </Button>
      </Box>
      {error && <Typography color="error" sx={{ mb: 2, fontWeight: 600 }}>{error}</Typography>}
      <Box sx={{ height: 4 }} />
      <DataTable columns={columnsWithActions} rows={rows} />
      <ModalCadastroGrupo open={openCadastro} onClose={() => setOpenCadastro(false)} onSuccess={() => { setOpenCadastro(false); fetchData(); }} />
      {editId !== null && (
        <ModalEditarGrupo open={!!editId} id={editId} onSuccess={() => { setEditId(null); fetchData(); }} />
      )}
      {loading && <LoadingCenter />}
    </Box>
  );
}
