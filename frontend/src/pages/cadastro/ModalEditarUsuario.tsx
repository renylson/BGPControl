import { useEffect, useState } from 'react';
import ReusableForm from '../../components/ReusableForm';
import type { FormField } from '../../components/ReusableForm';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import api from '../../api/axios';

const fields: FormField[] = [
  { name: 'username', label: 'Usuário', required: true, autoFocus: true },
  { name: 'email', label: 'E-mail', type: 'email', required: true },
  { name: 'name', label: 'Nome Completo', required: true },
  {
    name: 'profile',
    label: 'Perfil',
    type: 'select',
    required: true,
    options: [
      { label: 'Administrador', value: 'Administrador' },
      { label: 'Operador', value: 'Operador' },
    ],
  },
  { name: 'password', label: 'Senha', type: 'password', required: false },
];

export default function ModalEditarUsuario({ open, id, onClose, onSuccess }: { open: boolean; id: number; onClose: () => void; onSuccess: () => void }) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!open || !id) return;
    setLoadingData(true);
    api.get(`/users/${id}`)
      .then(res => setValues(res.data))
      .catch(() => setErrors({ geral: 'Erro ao carregar dados do usuário.' }))
      .finally(() => setLoadingData(false));
  }, [id, open]);

  const handleChange = (name: string, value: any) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.put(`/users/${id}`, values);
      onSuccess();
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors({ geral: err.response.data.detail });
      } else {
        setErrors({ geral: 'Erro ao atualizar usuário.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Usuário</DialogTitle>
      <DialogContent>
        <ReusableForm
          fields={fields}
          values={values}
          errors={errors}
          onChange={handleChange}
          onSubmit={handleSubmit}
          loading={loading}
        >
          {errors.geral && (
            <Typography color="error" sx={{ mt: 2 }}>
              {errors.geral}
            </Typography>
          )}
        </ReusableForm>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Cancelar</Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}
