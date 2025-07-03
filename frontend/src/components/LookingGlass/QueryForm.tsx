import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  Collapse,
  FormHelperText
} from '@mui/material';
import { SearchOutlined } from '@mui/icons-material';
import { lookingGlassAPI } from '../../api/lookingGlass';
import type { QueryRequest, Router } from '../../types/lookingGlass';
import { QUERY_TYPES } from '../../types/lookingGlass';

interface QueryFormProps {
  onQuerySubmit: (request: QueryRequest) => void;
  loading?: boolean;
}

export default function QueryForm({ onQuerySubmit, loading = false }: QueryFormProps) {
  const [formData, setFormData] = useState<QueryRequest>({
    type: 'ping',
    target: '',
    routerId: 0,
    options: {}
  });
  const [routers, setRouters] = useState<Router[]>([]);
  const [selectedRouter, setSelectedRouter] = useState<Router | null>(null);
  const [loadingRouters, setLoadingRouters] = useState(true);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRouters();
  }, []);

  const loadRouters = async () => {
    try {
      setLoadingRouters(true);
      setError(''); // Limpar erro anterior
      const routerList = await lookingGlassAPI.getRouters();
      setRouters(routerList);
      if (routerList.length > 0) {
        setFormData(prev => ({ ...prev, routerId: routerList[0].id }));
        setSelectedRouter(routerList[0]);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar lista de roteadores';
      setError(errorMessage);
      console.error('Error loading routers:', err);
    } finally {
      setLoadingRouters(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.target.trim()) {
      errors.target = 'Destino é obrigatório';
    } else {
      // Validação baseada na versão IP selecionada
      const ipVersion = formData.options?.ipVersion || 4;
      
      if (ipVersion === 4) {
        // Validação IPv4
        const isValidIPv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(formData.target);
        if (!isValidIPv4) {
          errors.target = 'Insira um endereço IPv4 válido (ex: 8.8.8.8)';
        }
      } else {
        // Validação IPv6
        const isValidIPv6 = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/.test(formData.target) ||
                           /^(?:[0-9a-fA-F]{1,4}:){1,7}:$/.test(formData.target) ||
                           /^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/.test(formData.target);
        if (!isValidIPv6) {
          errors.target = 'Insira um endereço IPv6 válido (ex: 2001:db8::1)';
        }
      }
    }

    if (!formData.routerId) {
      errors.routerId = 'Selecione um roteador';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setError('');
    onQuerySubmit(formData);
  };

  const handleInputChange = (field: keyof QueryRequest, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Se mudou a versão IP, limpar o IP de origem selecionado
      if (field === 'options' && value.ipVersion !== prev.options?.ipVersion) {
        newData.options = { ...value, sourceIp: '' };
        newData.target = ''; // Limpar também o target para forçar nova entrada
      }
      
      return newData;
    });
    
    // Se mudou o roteador, atualizar o roteador selecionado
    if (field === 'routerId') {
      const router = routers.find(r => r.id === value);
      setSelectedRouter(router || null);
    }
    
    // Limpar erro de validação quando usuário começar a digitar
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const availableSourceIps = selectedRouter?.ip_origens || [];
  
  // Filtrar IPs de origem baseado na versão IP selecionada
  const filteredSourceIps = availableSourceIps.filter(ipOrigem => {
    const ipVersion = formData.options?.ipVersion || 4;
    const isIPv6 = ipOrigem.ip.includes(':');
    return ipVersion === 6 ? isIPv6 : !isIPv6;
  });

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Collapse in={!!error}>
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      </Collapse>

      <Box component="form" onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            <FormControl fullWidth error={!!validationErrors.type}>
              <InputLabel>Tipo de Consulta</InputLabel>
              <Select
                value={formData.type}
                label="Tipo de Consulta"
                onChange={(e) => handleInputChange('type', e.target.value)}
                disabled={loading}
              >
                {QUERY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth error={!!validationErrors.routerId}>
              <InputLabel>Roteador</InputLabel>
              <Select
                value={formData.routerId || ''}
                label="Roteador"
                onChange={(e) => handleInputChange('routerId', Number(e.target.value))}
                disabled={loading || loadingRouters}
              >
                {routers.map((router) => (
                  <MenuItem key={router.id} value={router.id}>
                    <Box>
                      <Typography variant="body1">{router.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {router.hostname} - {router.status}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {loadingRouters && (
                <FormHelperText>
                  <CircularProgress size={12} /> Carregando roteadores...
                </FormHelperText>
              )}
              {validationErrors.routerId && (
                <FormHelperText error>{validationErrors.routerId}</FormHelperText>
              )}
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label="Destino (IPv4 ou IPv6)"
            placeholder={formData.options?.ipVersion === 6 ? "Ex: 2001:db8::1" : "Ex: 8.8.8.8"}
            value={formData.target}
            onChange={(e) => handleInputChange('target', e.target.value)}
            error={!!validationErrors.target}
            helperText={validationErrors.target}
            disabled={loading}
          />

          {/* Opções específicas por tipo de query */}
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            {(formData.type === 'ping' || formData.type === 'traceroute' || formData.type === 'bgp' || formData.type === 'bgp-summary') && (
              <FormControl fullWidth>
                <InputLabel>Versão IP</InputLabel>
                <Select
                  value={formData.options?.ipVersion || 4}
                  label="Versão IP"
                  onChange={(e) => handleInputChange('options', { 
                    ...formData.options, 
                    ipVersion: e.target.value as 4 | 6
                  })}
                  disabled={loading}
                >
                  <MenuItem value={4}>IPv4</MenuItem>
                  <MenuItem value={6}>IPv6</MenuItem>
                </Select>
              </FormControl>
            )}

            {(formData.type === 'ping' || formData.type === 'traceroute') && filteredSourceIps.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>IP de Origem</InputLabel>
                <Select
                  value={formData.options?.sourceIp || ''}
                  label="IP de Origem"
                  onChange={(e) => handleInputChange('options', { 
                    ...formData.options, 
                    sourceIp: e.target.value 
                  })}
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>Selecione um IP de origem</em>
                  </MenuItem>
                  {filteredSourceIps.map((ipOrigem) => (
                    <MenuItem key={ipOrigem.id} value={ipOrigem.id}>
                      <Box>
                        <Typography variant="body1">{ipOrigem.ip}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ipOrigem.name} ({ipOrigem.type})
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            {formData.type === 'traceroute' && (
              <TextField
                fullWidth
                type="number"
                label="Max Hops"
                value={formData.options?.maxHops || 30}
                onChange={(e) => handleInputChange('options', { 
                  ...formData.options, 
                  maxHops: parseInt(e.target.value) || 30 
                })}
                inputProps={{ min: 1, max: 64 }}
                disabled={loading}
              />
            )}
          </Box>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || loadingRouters || !formData.target.trim() || !formData.routerId}
            startIcon={loading ? <CircularProgress size={20} /> : <SearchOutlined />}
            sx={{ minWidth: 120, alignSelf: 'flex-start' }}
          >
            {loading ? 'Executando...' : 'Executar Consulta'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
