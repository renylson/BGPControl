import { useState } from 'react';
import ReusableForm from '../../components/ReusableForm';
import type { FormField } from '../../components/ReusableForm';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import api from '../../api/axios';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';

const fields: FormField[] = [
  { name: 'name', label: 'Nome', required: true, autoFocus: true },
  { name: 'ip', label: 'IP', required: true },
  { name: 'ssh_port', label: 'Porta SSH', required: true, type: 'number' },
  { name: 'ssh_user', label: 'Usuário SSH', required: true },
  { name: 'ssh_password', label: 'Senha SSH', required: true, type: 'password' },
  { name: 'asn', label: 'ASN', required: true, type: 'number' },
  { name: 'note', label: 'Observação', required: false, multiline: true, minRows: 2 },
];

export default function CadastroRouters({ onSuccess, onCancel }: { onSuccess?: () => void, onCancel?: () => void }) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savedRouter, setSavedRouter] = useState<any>(null);

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
      const res = await api.post('/routers/', values);
      setSuccess('Roteador cadastrado com sucesso!');
      setSavedRouter(res.data); // Salva o roteador cadastrado
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors({ geral: err.response.data.detail });
      } else {
        setErrors({ geral: 'Erro ao cadastrar roteador.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestOutput(null);
    setTestError(null);
    try {
      const { ip, ssh_port, ssh_user, ssh_password } = values;
      const res = await api.post('/routers/test-connection', {
        ip,
        ssh_port,
        ssh_user,
        ssh_password
      });
      setTestResult(res.data.ok ? `Conexão bem-sucedida: ${res.data.message}` : `Falha: ${res.data.message}`);
      setTestOutput(res.data.output || '');
      setTestError(res.data.error || '');
      setTestModalOpen(true);
    } catch (err: any) {
      setTestResult('Erro ao testar conexão.');
      setTestOutput('');
      setTestError('');
      setTestModalOpen(true);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 540, mx: 'auto', mt: 2, mb: 2, background: 'rgba(30,32,38,0.98)', borderRadius: 4, boxShadow: '0 4px 32px 0 rgba(31,38,135,0.10)', p: { xs: 2, sm: 4 }, marginLeft: 0, marginRight: 0, color: 'text.primary' }}>
      <ReusableForm
        title="Cadastro de Roteador"
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
            onClick={handleTestConnection}
            variant="outlined"
            color="info"
            startIcon={<WifiTetheringIcon />}
            sx={{ fontWeight: 600, fontSize: 13, py: 0.7, borderRadius: 2, minWidth: 90, maxWidth: 110 }}
            disabled={loading || testing || !savedRouter}
          >
            {testing ? 'Testando...' : 'Testar'}
          </Button>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="contained"
              color="error"
              startIcon={<CloseIcon />}
              sx={{ fontWeight: 600, fontSize: 13, py: 0.7, borderRadius: 2, minWidth: 70, maxWidth: 100 }}
              disabled={loading}
            >
              Cancelar
            </Button>
          )}
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
        {testResult && (
          <Dialog open={testModalOpen} onClose={() => setTestModalOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Resultado do Teste de Conexão SSH</DialogTitle>
            <DialogContent>
              <Typography sx={{ mb: 2 }} color={testResult.startsWith('Conexão') ? 'success.main' : 'error'}>
                {testResult}
              </Typography>
              {testOutput && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#bbb' }}>Output:</Typography>
                  <Box component="pre" sx={{ bgcolor: '#181c24', color: '#fff', p: 2, borderRadius: 2, fontSize: 15, maxHeight: 300, overflow: 'auto' }}>{testOutput}</Box>
                </Box>
              )}
              {testError && (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#f44336' }}>Stderr:</Typography>
                  <Box component="pre" sx={{ bgcolor: '#181c24', color: '#f44336', p: 2, borderRadius: 2, fontSize: 15, maxHeight: 200, overflow: 'auto' }}>{testError}</Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTestModalOpen(false)} color="primary" variant="contained">Fechar</Button>
            </DialogActions>
          </Dialog>
        )}
      </ReusableForm>
    </Box>
  );
}
