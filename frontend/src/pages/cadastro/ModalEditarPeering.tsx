import { useEffect, useState } from 'react';
import ReusableForm from '../../components/ReusableForm';
import type { FormField } from '../../components/ReusableForm';
import { Typography, Box, Button, Dialog, DialogTitle, DialogContent } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getRouters } from '../../api/routers';
import api from '../../api/axios';

export default function ModalEditarPeering({ id, open, onClose, onSuccess }: { id: number, open: boolean, onClose: () => void, onSuccess?: () => void }) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [routers, setRouters] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoadingData(true);
    api.get(`/peerings/${id}`)
      .then(res => setValues(res.data))
      .catch(() => setErrors({ geral: 'Erro ao carregar dados do peering.' }))
      .finally(() => setLoadingData(false));
    getRouters().then(setRouters);
  }, [id]);

  const fields: FormField[] = [
    { name: 'name', label: 'Nome', required: true, autoFocus: true },
    { name: 'ip', label: 'IP', required: true },
    { name: 'type', label: 'Tipo', required: true, type: 'select', options: [
      { value: 'IPv4', label: 'IPv4' },
      { value: 'IPv6', label: 'IPv6' },
    ] },
    { name: 'remote_asn', label: 'ASN Remoto', required: true, type: 'number' },
    { name: 'remote_asn_name', label: 'Nome ASN Remoto', required: true },
    { name: 'router_id', label: 'Roteador', required: true, type: 'select', options: routers.map((r: any) => ({ value: r.id, label: r.name })) },
    { name: 'note', label: 'Observação', required: false, multiline: true, minRows: 2 },
  ];

  const handleChange = (name: string, value: any) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setErrors({});
    try {
      await api.put(`/peerings/${id}`, values);
      setSuccess('Peering atualizado com sucesso!');
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors({ geral: err.response.data.detail });
      } else {
        setErrors({ geral: 'Erro ao atualizar peering.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Peering</DialogTitle>
      <DialogContent>
        {loadingData ? (
          <Typography sx={{ mt: 4, textAlign: 'center' }}>Carregando dados...</Typography>
        ) : (
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
            {success && (
              <Typography color="success.main" sx={{ mt: 2 }}>
                {success}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
              <Button
                onClick={onClose}
                variant="contained"
                color="error"
                startIcon={<CloseIcon />}
                sx={{ fontWeight: 600, fontSize: 13, py: 0.7, borderRadius: 2, minWidth: 70, maxWidth: 100 }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                sx={{ fontWeight: 600, fontSize: 13, py: 0.7, borderRadius: 2, minWidth: 70, maxWidth: 100 }}
                disabled={loading}
              >
                Salvar
              </Button>
            </Box>
          </ReusableForm>
        )}
      </DialogContent>
    </Dialog>
  );
}
