
import ModalIpOrigem from './ModalIpOrigem';
import type { IpOrigem } from './ModalIpOrigem';
import { useEffect, useState } from 'react';
import ReusableForm from '../../components/ReusableForm';
import type { FormField } from '../../components/ReusableForm';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import api from '../../api/axios';
import { useParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import LoadingCenter from '../../components/LoadingCenter';

const fields: FormField[] = [
  { name: 'name', label: 'Nome', required: true, autoFocus: true },
  { name: 'ip', label: 'IP', required: true },
  { name: 'ssh_port', label: 'Porta SSH', required: true, type: 'number' },
  { name: 'ssh_user', label: 'Usuário SSH', required: true },
  { name: 'ssh_password', label: 'Senha SSH (preencha para alterar)', required: false, type: 'password' },
  { name: 'asn', label: 'ASN', required: true, type: 'number' },
  { name: 'note', label: 'Observação', required: false, multiline: true, minRows: 2 },
  { name: 'is_active', label: 'Ativo', required: false, type: 'checkbox' },
];

export default function EditarRouter({ id: propId, onSuccess, onCancel }: { id?: string | number, onSuccess?: (updated?: any) => void, onCancel?: () => void }) {
  const { id: paramId } = useParams();
  const id = propId ?? paramId;
  const [modalIpOrigemOpen, setModalIpOrigemOpen] = useState(false);
  const [ipOrigens, setIpOrigens] = useState<IpOrigem[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  // Removido testError/setTestError pois não é mais utilizado
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadingData(true);
    api.get(`/routers/${id}`)
      .then(res => {
        setValues(res.data);
        // Carregar IPs de origem se existir campo
        setIpOrigens(res.data.ip_origens || []);
      })
      .catch(() => setErrors({ geral: 'Erro ao carregar dados do roteador.' }))
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
      // Inclui ipOrigens no payload
      await api.put(`/routers/${id}`, { ...values, ip_origens: ipOrigens });
      const updated = await api.get(`/routers/${id}`);
      setSuccess('Roteador atualizado com sucesso!');
      if (onSuccess) onSuccess(updated.data);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors({ geral: err.response.data.detail });
      } else {
        setErrors({ geral: 'Erro ao atualizar roteador.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult('Iniciando teste de conexão SSH...');
    setTestOutput('');
    setTestModalOpen(true);
    try {
      const { ip, ssh_port, ssh_user, ssh_password } = values;
      const res = await api.post('/routers/test-connection', {
        ip,
        ssh_port,
        ssh_user,
        ssh_password
      });
      let processLog = '';
      if (res.data && res.data.message) processLog += res.data.message + '\n';
      if (res.data && res.data.output) processLog += '\nOutput:\n' + res.data.output + '\n';
      if (res.data && res.data.error) processLog += '\nStderr:\n' + res.data.error + '\n';
      setTestResult(res.data.ok ? `Conexão bem-sucedida` : `Falha na conexão`);
      setTestOutput(processLog.trim());
    } catch (err: any) {
      let msg = 'Erro ao testar conexão.';
      let processLog = '';
      if (err.response && err.response.data) {
        if (err.response.data.message) processLog += err.response.data.message + '\n';
        if (err.response.data.output) processLog += '\nOutput:\n' + err.response.data.output + '\n';
        if (err.response.data.error) processLog += '\nStderr:\n' + err.response.data.error + '\n';
        msg = err.response.data.message || msg;
      } else if (err.message) {
        msg = err.message;
        processLog += err.message + '\n';
      }
      setTestResult(msg);
      setTestOutput(processLog.trim());
    } finally {
      setTesting(false);
    }
  };

  if (loadingData) return <LoadingCenter message="Carregando dados..." />;

  return (
    <Box sx={{
      width: 'calc(100% - 20px)',
      maxWidth: '100vw',
      mx: 'auto',
      mt: 6,
      mb: 6,
      background: 'linear-gradient(135deg, #232a36 0%, #181c24 100%)',
      borderRadius: 4,
      boxShadow: '0 4px 32px 0 rgba(31,38,135,0.18)',
      p: { xs: 2, sm: 4 },
      color: 'text.primary',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      marginLeft: 0,
      marginRight: 0,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <EditIcon sx={{ fontSize: 36, color: 'primary.main' }} />
        <Typography variant="h4" color="primary.main" fontWeight={800} sx={{ letterSpacing: 1 }}>Editar Roteador</Typography>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 520 }}>
          <ReusableForm
            fields={fields}
            values={values}
            errors={errors}
            onChange={handleChange}
            onSubmit={handleSubmit}
            loading={loading}
            title={undefined}
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
                onClick={handleTestConnection}
                variant="outlined"
                color="info"
                startIcon={<WifiTetheringIcon />}
                sx={{ fontWeight: 600, fontSize: 13, py: 0.7, borderRadius: 2, minWidth: 90, maxWidth: 110 }}
                disabled={loading || testing}
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
            {/* Botão centralizado abaixo dos botões principais */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 1 }}>
              <Button
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600, fontSize: 13, borderRadius: 2, minWidth: 220, maxWidth: 300 }}
                onClick={() => setModalIpOrigemOpen(true)}
              >
                Gerenciar IPs de Origem
              </Button>
            </Box>
            {testResult && (
              <Dialog open={testModalOpen} onClose={() => setTestModalOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Resultado do Teste de Conexão SSH</DialogTitle>
                <DialogContent>
                  <Typography sx={{ mb: 2 }} color={testResult.startsWith('Conexão') ? 'success.main' : 'error'}>
                    {testResult}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#bbb' }}>Processo completo:</Typography>
                    <Box component="pre" sx={{ bgcolor: '#181c24', color: '#fff', p: 2, borderRadius: 2, fontSize: 15, maxHeight: 400, overflow: 'auto' }}>{testOutput}</Box>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setTestModalOpen(false)} color="primary" variant="contained">Fechar</Button>
                </DialogActions>
              </Dialog>
            )}
          </ReusableForm>
          <ModalIpOrigem
            open={modalIpOrigemOpen}
            onClose={() => setModalIpOrigemOpen(false)}
            origens={ipOrigens}
            onSave={(list) => { setIpOrigens(list); setModalIpOrigemOpen(false); }}
          />
        </Box>
      </Box>
    </Box>
  );
}
