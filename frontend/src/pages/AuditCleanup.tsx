import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CleaningServices as CleanupIcon,
  Analytics as StatsIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Componentes padronizados
import PageLayout from '../components/PageLayout';
import StyledCard from '../components/StyledCard';

// API e tipos
import { auditCleanupApi } from '../api/auditCleanup';
import type { AuditStats, CleanupResult } from '../api/auditCleanup';

const AuditCleanup: React.FC = () => {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [autoCleanupLoading, setAutoCleanupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [monthsToKeep, setMonthsToKeep] = useState<number>(6);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [autoCleanupDialogOpen, setAutoCleanupDialogOpen] = useState(false);
  const [lastCleanupResult, setLastCleanupResult] = useState<CleanupResult | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await auditCleanupApi.getStats();
      if (response.success) {
        setStats(response.stats);
      } else {
        setError('Erro ao carregar estatísticas');
      }
    } catch (err) {
      setError('Erro ao carregar estatísticas: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setCleanupLoading(true);
    setError(null);
    try {
      const result = await auditCleanupApi.cleanupOldLogs(monthsToKeep);
      if (result.success) {
        setLastCleanupResult(result);
        setSuccess(`Limpeza concluída! ${result.deleted_count} logs removidos, ${result.freed_space_mb.toFixed(2)} MB liberados`);
        setCleanupDialogOpen(false);
        await loadStats(); // Recarregar estatísticas
      } else {
        setError('Erro na limpeza: ' + result.message);
      }
    } catch (err) {
      setError('Erro na limpeza: ' + (err as Error).message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleAutoCleanup = async () => {
    setAutoCleanupLoading(true);
    setError(null);
    try {
      const result = await auditCleanupApi.enableAutoCleanup(monthsToKeep);
      if (result.success) {
        setLastCleanupResult(result.cleanup_result);
        setSuccess(result.message);
        setAutoCleanupDialogOpen(false);
        await loadStats(); // Recarregar estatísticas
      } else {
        setError('Erro na configuração automática: ' + result.message);
      }
    } catch (err) {
      setError('Erro na configuração automática: ' + (err as Error).message);
    } finally {
      setAutoCleanupLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getLogsByActionData = () => {
    if (!stats?.logs_by_action) return [];
    return Object.entries(stats.logs_by_action).map(([action, count]) => ({
      action,
      count
    }));
  };

  const getLogsByMonthData = () => {
    if (!stats?.logs_by_month) return [];
    return Object.entries(stats.logs_by_month)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month,
        count
      }));
  };

  return (
    <PageLayout title="Gerenciamento de Logs de Auditoria" icon={<CleanupIcon />}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadStats}
              disabled={loading}
              sx={{ color: '#f5f5f5', borderColor: '#f5f5f5' }}
            >
              Atualizar
            </Button>
          </Box>
        </Box>

        {/* Estatísticas Gerais */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
            <StyledCard>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatsIcon sx={{ color: '#1976d2' }} />
                  <Typography variant="h6" sx={{ color: '#f5f5f5' }}>
                    Total de Logs
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: '#1976d2', mt: 1 }}>
                  {loading ? <CircularProgress size={24} /> : stats?.total_logs?.toLocaleString() || '0'}
                </Typography>
              </CardContent>
            </StyledCard>
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f5f5f5', mb: 1 }}>
                  Tamanho Estimado
                </Typography>
                <Typography variant="h4" sx={{ color: '#2e7d32' }}>
                  {loading ? <CircularProgress size={24} /> : `${stats?.size_estimation_mb?.toFixed(1) || '0'} MB`}
                </Typography>
              </CardContent>
            </StyledCard>
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f5f5f5', mb: 1 }}>
                  Log Mais Antigo
                </Typography>
                <Typography variant="body1" sx={{ color: '#ff9800' }}>
                  {loading ? <CircularProgress size={24} /> : formatDate(stats?.oldest_log_date || null)}
                </Typography>
              </CardContent>
            </StyledCard>
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f5f5f5', mb: 1 }}>
                  Log Mais Recente
                </Typography>
                <Typography variant="body1" sx={{ color: '#4caf50' }}>
                  {loading ? <CircularProgress size={24} /> : formatDate(stats?.newest_log_date || null)}
                </Typography>
              </CardContent>
            </StyledCard>
          </Box>
        </Box>

        {/* Ações de Limpeza */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: '1 1 400px', minWidth: 350 }}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f5f5f5', mb: 2 }}>
                  Limpeza Manual
                </Typography>
                <Typography variant="body2" sx={{ color: '#ccc', mb: 3 }}>
                  Execute uma limpeza manual dos logs de auditoria mais antigos que o período especificado.
                </Typography>
                
                <TextField
                  label="Meses para manter"
                  type="number"
                  value={monthsToKeep}
                  onChange={(e) => setMonthsToKeep(Number(e.target.value))}
                  inputProps={{ min: 1, max: 24 }}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#f5f5f5' } }}
                  fullWidth
                />
                
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<CleanupIcon />}
                  onClick={() => setCleanupDialogOpen(true)}
                  disabled={cleanupLoading}
                  fullWidth
                >
                  {cleanupLoading ? 'Executando...' : 'Executar Limpeza'}
                </Button>
              </CardContent>
            </StyledCard>
          </Box>

          <Box sx={{ flex: '1 1 400px', minWidth: 350 }}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f5f5f5', mb: 2 }}>
                  Limpeza Automática
                </Typography>
                <Typography variant="body2" sx={{ color: '#ccc', mb: 3 }}>
                  Configure e execute a limpeza automática dos logs de auditoria (cron jobs já configurados no sistema).
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  A limpeza automática via cron job já está configurada para executar semanalmente.
                </Alert>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<ScheduleIcon />}
                  onClick={() => setAutoCleanupDialogOpen(true)}
                  disabled={autoCleanupLoading}
                  fullWidth
                >
                  {autoCleanupLoading ? 'Configurando...' : 'Executar Agora'}
                </Button>
              </CardContent>
            </StyledCard>
          </Box>
        </Box>

        {/* Resultado da Última Limpeza */}
        {lastCleanupResult && (
          <StyledCard sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#f5f5f5', mb: 2 }}>
                Resultado da Última Limpeza
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Chip 
                  label={`${lastCleanupResult.deleted_count} logs removidos`}
                  color="error"
                  variant="outlined"
                />
                <Chip 
                  label={`${lastCleanupResult.freed_space_mb.toFixed(2)} MB liberados`}
                  color="success"
                  variant="outlined"
                />
                <Chip 
                  label={`Executado em: ${formatDate(lastCleanupResult.cleanup_date)}`}
                  color="info"
                  variant="outlined"
                />
                <Chip 
                  label={`Log mais antigo restante: ${formatDate(lastCleanupResult.oldest_remaining_date)}`}
                  color="default"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </StyledCard>
        )}

        {/* Logs por Ação */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 400px', minWidth: 350 }}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f5f5f5', mb: 2 }}>
                  Logs por Ação
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#f5f5f5' }}>Ação</TableCell>
                          <TableCell sx={{ color: '#f5f5f5' }} align="right">Quantidade</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getLogsByActionData().map((row) => (
                          <TableRow key={row.action}>
                            <TableCell sx={{ color: '#ccc' }}>{row.action}</TableCell>
                            <TableCell sx={{ color: '#ccc' }} align="right">{row.count.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </StyledCard>
          </Box>

          <Box sx={{ flex: '1 1 400px', minWidth: 350 }}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f5f5f5', mb: 2 }}>
                  Logs por Mês
                </Typography>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#f5f5f5' }}>Mês</TableCell>
                          <TableCell sx={{ color: '#f5f5f5' }} align="right">Quantidade</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getLogsByMonthData().map((row) => (
                          <TableRow key={row.month}>
                            <TableCell sx={{ color: '#ccc' }}>{row.month}</TableCell>
                            <TableCell sx={{ color: '#ccc' }} align="right">{row.count.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </StyledCard>
          </Box>
        </Box>

        {/* Dialog de Confirmação - Limpeza Manual */}
        <Dialog open={cleanupDialogOpen} onClose={() => setCleanupDialogOpen(false)}>
          <DialogTitle>Confirmar Limpeza Manual</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja executar a limpeza manual dos logs de auditoria? 
              Serão removidos todos os logs mais antigos que <strong>{monthsToKeep} meses</strong>.
              <br /><br />
              Esta ação não pode ser desfeita.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setCleanupDialogOpen(false)} 
              disabled={cleanupLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCleanup} 
              color="warning" 
              variant="contained"
              disabled={cleanupLoading}
            >
              {cleanupLoading ? 'Executando...' : 'Confirmar Limpeza'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Confirmação - Limpeza Automática */}
        <Dialog open={autoCleanupDialogOpen} onClose={() => setAutoCleanupDialogOpen(false)}>
          <DialogTitle>Executar Limpeza Automática</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Executar limpeza automática agora? Serão removidos todos os logs mais antigos que <strong>{monthsToKeep} meses</strong>.
              <br /><br />
              Nota: A limpeza automática via cron job já está configurada para executar semanalmente no sistema.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setAutoCleanupDialogOpen(false)} 
              disabled={autoCleanupLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAutoCleanup} 
              color="primary" 
              variant="contained"
              disabled={autoCleanupLoading}
            >
              {autoCleanupLoading ? 'Executando...' : 'Executar Agora'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbars para feedback */}
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
        >
          <Alert onClose={() => setError(null)} severity="error">
            {error}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess(null)}
        >
          <Alert onClose={() => setSuccess(null)} severity="success">
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  );
};

export default AuditCleanup;
