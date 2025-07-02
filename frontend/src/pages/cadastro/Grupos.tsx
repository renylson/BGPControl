import { useState } from 'react';
import ReusableForm from '../../components/ReusableForm';
import type { FormField } from '../../components/ReusableForm';
import { Box, Typography } from '@mui/material';
import api from '../../api/axios';

const fields: FormField[] = [
  { name: 'name', label: 'Nome do Grupo', required: true, autoFocus: true },
  { name: 'description', label: 'Descrição', required: false, multiline: true, minRows: 2 },
];

export default function CadastroGrupos() {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
      await api.post('/grupos', values);
      setSuccess('Grupo cadastrado com sucesso!');
      setValues({});
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
    <Box sx={{ maxWidth: 540, mx: 'auto', mt: 6, mb: 6, background: 'rgba(255,255,255,0.95)', borderRadius: 6, boxShadow: '0 4px 32px 0 rgba(31,38,135,0.10)', p: { xs: 2, sm: 4 } }}>
      <ReusableForm
        title="Cadastro de Grupo"
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
      </ReusableForm>
    </Box>
  );
}
