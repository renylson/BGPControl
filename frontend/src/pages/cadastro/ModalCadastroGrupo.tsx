
import React, { useState, useEffect } from 'react';
import ReusableForm from '../../components/ReusableForm';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Checkbox, FormControlLabel } from '@mui/material';
import type { FormField } from '../../components/ReusableForm';
import { Typography } from '@mui/material';
import api from '../../api/axios';
import { getRouters } from '../../api/routers';

export default function ModalCadastroGrupo({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [values, setValues] = useState<Record<string, any>>({ is_active: true, type: 'IPv4' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [routers, setRouters] = useState<any[]>([]);
  const [peerings, setPeerings] = useState<any[]>([]);

  // Carrega roteadores ao abrir
  useEffect(() => {
    if (open) {
      getRouters().then(setRouters);
      setValues({ is_active: true, type: 'IPv4' });
      setErrors({});
      setSuccess('');
      setPeerings([]);
    }
  }, [open]);

  // Busca todos os peerings ao abrir o modal
  const [allPeerings, setAllPeerings] = useState<any[]>([]);
  useEffect(() => {
    if (open) {
      api.get('/peerings/').then(res => setAllPeerings(res.data));
    }
  }, [open]);

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

  const fields: FormField[] = [
    { name: 'name', label: 'Nome do Grupo', required: true, autoFocus: true },
    { name: 'description', label: 'Descrição', required: false, multiline: true, minRows: 2 },
    { name: 'router_id', label: 'Roteador', required: true, type: 'select', options: routers.map((r: any) => ({ value: r.id, label: r.name })) },
    { name: 'type', label: 'Tipo', required: true, type: 'select', options: [ { value: 'IPv4', label: 'IPv4' }, { value: 'IPv6', label: 'IPv6' } ] },
    { name: 'peering_ids', label: 'Peerings', required: true, type: 'select-multiple', options: peerings.map((p: any) => ({ value: p.id, label: `${p.name} (${p.ip})` })) },
    // O campo será renderizado manualmente como checkbox
  ];



  const handleChange = (name: string, value: any) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: '' }));
    if (name === 'router_id' || name === 'type') {
      setValues((v) => ({ ...v, peering_ids: [] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setErrors({});
    try {
      await api.post('/peering-groups/', values);
      setSuccess('Grupo cadastrado com sucesso!');
      setValues({ is_active: true });
      onSuccess();
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors({ geral: err.response.data.detail });
      } else {
        setErrors({ geral: 'Erro ao cadastrar grupo.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'primary.main', fontWeight: 800, textAlign: 'center' }}>Cadastro de Grupo</DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'flex-end', gap: 2, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}
