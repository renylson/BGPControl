import { useEffect, useState } from 'react';
import ReusableForm from '../../components/ReusableForm';
import type { FormField } from '../../components/ReusableForm';
import { Box, Typography } from '@mui/material';
import api from '../../api/axios';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingCenter from '../../components/LoadingCenter';

const fields: FormField[] = [
  { name: 'name', label: 'Nome do Grupo', required: true, autoFocus: true },
  { name: 'description', label: 'Descrição', required: false, multiline: true, minRows: 2 },
];

export default function EditarGrupo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoadingData(true);
    api.get(`/grupos/${id}`)
      .then(res => setValues(res.data))
      .catch(() => setErrors({ geral: 'Erro ao carregar dados do grupo.' }))
      .finally(() => setLoadingData(false));
  }, [id]);

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
      await api.put(`/grupos/${id}`, values);
      setSuccess('Grupo atualizado com sucesso!');
      setTimeout(() => navigate('/cadastro/grupos'), 1200);
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

  if (loadingData) return <LoadingCenter message="Carregando dados..." />;

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 4 }}>
      <ReusableForm
        title="Editar Grupo"
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
