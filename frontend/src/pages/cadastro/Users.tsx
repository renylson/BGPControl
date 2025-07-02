import { useState } from 'react';
import ReusableForm from '../../components/ReusableForm';
import type { FormField } from '../../components/ReusableForm';
import { Box, Typography } from '@mui/material';
import api from '../../api/axios';

const fields: FormField[] = [
  { name: 'username', label: 'Usuário', required: true, autoFocus: true },
  { name: 'email', label: 'E-mail', type: 'email', required: true },
  { name: 'full_name', label: 'Nome Completo', required: true },
  { name: 'password', label: 'Senha', type: 'password', required: true },
];

export default function CadastroUsuarios() {
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
      await api.post('/users', values);
      setSuccess('Usuário cadastrado com sucesso!');
      setValues({});
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors({ geral: err.response.data.detail });
      } else {
        setErrors({ geral: 'Erro ao cadastrar usuário.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 4 }}>
      <ReusableForm
        title="Cadastro de Usuário"
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
      </ReusableForm>
    </Box>
  );
}
