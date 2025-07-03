import React, { useEffect, useState } from 'react';
import ReusableForm from '../../components/ReusableForm';
import type { FormField } from '../../components/ReusableForm';
import { Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, Checkbox, FormControlLabel } from '@mui/material';
import api from '../../api/axios';
import { getRouters } from '../../api/routers';

export default function ModalEditarGrupo({ open, id, onSuccess }: { open: boolean; id: number; onSuccess: () => void }) {
  const [routers, setRouters] = useState<any[]>([]);
  const [peerings, setPeerings] = useState<any[]>([]);
  const [allPeerings, setAllPeerings] = useState<any[]>([]);
  // routerLoaded removido pois não é usado

  const fields: FormField[] = [
    { name: 'name', label: 'Nome do Grupo', required: true, autoFocus: true },
    { name: 'description', label: 'Descrição', required: false, multiline: true, minRows: 2 },
    { name: 'router_id', label: 'Roteador', required: true, type: 'select', options: routers.map((r: any) => ({ value: r.id, label: r.name })) },
    { name: 'type', label: 'Tipo', required: true, type: 'select', options: [ { value: 'IPv4', label: 'IPv4' }, { value: 'IPv6', label: 'IPv6' } ] },
    { name: 'peering_ids', label: 'Peerings', required: true, type: 'select-multiple', options: peerings.map((p: any) => ({ value: p.id, label: `${p.name} (${p.ip})` })) },
    // O campo será renderizado manualmente como checkbox
  ];

  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Limpa o formulário ao abrir
  useEffect(() => {
    if (!open) return;
    setValues({});
    setErrors({});
    setSuccess('');
    setLoadingData(true);
    getRouters().then(rs => setRouters(rs));
    api.get('/peerings').then(peeringsRes => {
      setAllPeerings(peeringsRes.data);
      api.get(`/peering-groups/${id}/`)
        .then(res => {
          const group = res.data;
          // Descobrir o tipo dos peerings do grupo
          let type = 'IPv4';
          if (group.peering_ids && group.peering_ids.length > 0) {
            const peeringsDoGrupo = peeringsRes.data.filter((p: any) => group.peering_ids.includes(p.id));
            if (peeringsDoGrupo.length > 0) {
              type = peeringsDoGrupo[0].type;
            }
          }
          setValues({ ...group, type });
        })
        .catch(() => setErrors({ geral: 'Erro ao carregar dados do grupo.' }))
        .finally(() => setLoadingData(false));
    });
  }, [id, open]);

  // Filtra peerings conforme roteador e tipo
  useEffect(() => {
    if (values.router_id && values.type) {
      setPeerings(
        allPeerings.filter(
          (p: any) => p.router_id === values.router_id && p.type === values.type
        )
      );
    } else {
      setPeerings([]);
    }
  }, [values.router_id, values.type, allPeerings]);

  const handleChange = (name: string, value: any) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: '' }));
    // Não permite trocar router_id na edição, mas se fosse permitido, limparia peerings:
    // if (name === 'router_id') setValues((v) => ({ ...v, peering_ids: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setErrors({});
    try {
      await api.put(`/peering-groups/${id}/`, values);
      setSuccess('Grupo atualizado com sucesso!');
      onSuccess();
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors({ geral: err.response.data.detail });
      } else {
        setErrors({ geral: 'Erro ao atualizar grupo.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <Dialog open={open} onClose={onSuccess} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'primary.main', fontWeight: 800, textAlign: 'center' }}>Editar Grupo</DialogTitle>
      <DialogContent>
        {loadingData ? (
          <div style={{ minWidth: 400, minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary">Carregando dados do grupo...</Typography>
          </div>
        ) : (
          <ReusableForm
            fields={fields}
            values={values}
            errors={errors}
            onChange={handleChange}
            onSubmit={handleSubmit}
            loading={loading}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!values.is_active}
                  onChange={e => handleChange('is_active', e.target.checked)}
                  color="primary"
                  name="is_active"
                />
              }
              label="Ativo"
              sx={{ mt: 2 }}
            />
            {errors.geral && (
              <Typography color="error" sx={{ mt: 2, fontWeight: 600 }}>
                {errors.geral}
              </Typography>
            )}
            {success && (
              <Typography color="success.main" sx={{ mt: 2, fontWeight: 600 }}>
                {success}
              </Typography>
            )}
          </ReusableForm>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'flex-end', gap: 2, pb: 2 }}>
        <Button onClick={onSuccess} color="inherit" disabled={loading}>Cancelar</Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading || loadingData}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}
