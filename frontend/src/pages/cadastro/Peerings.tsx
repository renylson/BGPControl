import { useState, useEffect } from 'react';
import ReusableForm from '../../components/ReusableForm';
import type { FormField } from '../../components/ReusableForm';
import { Typography, Box, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getRouters } from '../../api/routers';
import api from '../../api/axios';

export default function CadastroPeerings({ onSuccess }: { onSuccess?: () => void }) {
  const [values, setValues] = useState<Record<string, any>>({ type: 'IPv4' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [routers, setRouters] = useState<any[]>([]);

  useEffect(() => {
    getRouters().then(setRouters);
  }, []);

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
      await api.post('/peerings', values);
      setSuccess('Peering cadastrado com sucesso!');
      setValues({ type: 'IPv4' });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors({ geral: err.response.data.detail });
      } else {
        setErrors({ geral: 'Erro ao cadastrar peering.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReusableForm
      title="Cadastro de Peering"
      fields={fields}
      values={values}
      errors={errors}
      onChange={handleChange}
      onSubmit={handleSubmit}
      loading={loading}
    >
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
        <Button
          onClick={onSuccess}
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
  );
}
