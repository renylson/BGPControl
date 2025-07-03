import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Paper
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  History as HistoryIcon
} from '@mui/icons-material';
// Substituído date pickers por inputs nativos do HTML5
// Removido date-fns para evitar problemas de build

// Importar componentes padronizados
import PageLayout from '../components/PageLayout';
import StyledCard from '../components/StyledCard';

// Função de formatação de data nativa
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

import { auditApi } from '../api/audit';
import type { AuditLog, AuditLogFilter, AuditLogStats } from '../types/audit';

const LogsAuditoria: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Filtros
  const [filters, setFilters] = useState<AuditLogFilter>({
    limit: 25,
    offset: 0
  });
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableResourceTypes, setAvailableResourceTypes] = useState<string[]>([]);
  
  // Diálogos
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);

  // Carregar dados iniciais
  useEffect(() => {
    loadAvailableFilters();
    loadStats();
  }, []);

  // Carregar logs quando filtros mudarem
  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await auditApi.getLogs(filters);
      setLogs(data);
      setTotalLogs(data.length); // Na implementação real, isso viria do backend
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStats = async () => {
    try {
      const statsData = await auditApi.getStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const loadAvailableFilters = async () => {
    try {
      const [actions, resourceTypes] = await Promise.all([
        auditApi.getAvailableActions(),
        auditApi.getAvailableResourceTypes()
      ]);
      setAvailableActions(actions);
      setAvailableResourceTypes(resourceTypes);
    } catch (err: any) {
      console.error('Erro ao carregar filtros:', err);
    }
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    setFilters(prev => ({
      ...prev,
      offset: newPage * rowsPerPage
    }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    setFilters(prev => ({
      ...prev,
      limit: newRowsPerPage,
      offset: 0
    }));
  };

  const handleFilterChange = (field: keyof AuditLogFilter, value: any) => {
    setPage(0);
    setFilters(prev => ({
      ...prev,
      [field]: value,
      offset: 0
    }));
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const handleCleanupLogs = async () => {
    try {
      await auditApi.cleanupOldLogs(cleanupDays);
      setShowCleanupDialog(false);
      loadLogs();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao limpar logs');
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return 'success';
    if (action.includes('CREATE')) return 'primary';
    if (action.includes('UPDATE')) return 'warning';
    if (action.includes('DELETE')) return 'error';
    if (action.includes('FAILED')) return 'error';
    return 'default';
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'default';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'error';
    return 'default';
  };

  return (
    <PageLayout
      title="Logs de Auditoria"
      subtitle="Acompanhe todas as ações realizadas no sistema pelos usuários"
      icon={<HistoryIcon sx={{ fontSize: '2rem' }} />}
      actions={
        <IconButton 
          onClick={loadLogs} 
          disabled={loading}
          sx={{ 
            color: '#1976d2',
            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
          }}
        >
          <RefreshIcon />
        </IconButton>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Estatísticas */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 200px' }}>
            <StyledCard>
              <Typography variant="body2" sx={{ color: '#b0b8c1', mb: 1 }}>
                Total de Ações
              </Typography>
              <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 700 }}>
                {stats.total_actions}
              </Typography>
            </StyledCard>
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <StyledCard>
              <Typography variant="body2" sx={{ color: '#b0b8c1', mb: 1 }}>
                Logins
              </Typography>
              <Typography variant="h4" sx={{ color: '#66bb6a', fontWeight: 700 }}>
                {stats.login_count}
              </Typography>
            </StyledCard>
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <StyledCard>
              <Typography variant="body2" sx={{ color: '#b0b8c1', mb: 1 }}>
                Criações
              </Typography>
              <Typography variant="h4" sx={{ color: '#ffa726', fontWeight: 700 }}>
                {stats.create_count}
              </Typography>
            </StyledCard>
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <StyledCard>
              <Typography variant="body2" sx={{ color: '#b0b8c1', mb: 1 }}>
                Atualizações
              </Typography>
              <Typography variant="h4" sx={{ color: '#29b6f6', fontWeight: 700 }}>
                {stats.update_count}
              </Typography>
            </StyledCard>
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <StyledCard>
              <Typography variant="body2" sx={{ color: '#b0b8c1', mb: 1 }}>
                Exclusões
              </Typography>
              <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 700 }}>
                {stats.delete_count}
              </Typography>
            </StyledCard>
          </Box>
        </Box>
      )}

        {/* Filtros */}
        <StyledCard 
          title="Filtros"
          sx={{ mb: 3 }}
        >
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 120 }} size="small">
              <InputLabel>Ação</InputLabel>
              <Select
                value={filters.action || ''}
                label="Ação"
                onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
              >
                <MenuItem value="">Todas</MenuItem>
                {availableActions.map(action => (
                  <MenuItem key={action} value={action}>{action}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 140 }} size="small">
              <InputLabel>Tipo de Recurso</InputLabel>
              <Select
                value={filters.resource_type || ''}
                label="Tipo de Recurso"
                onChange={(e) => handleFilterChange('resource_type', e.target.value || undefined)}
              >
                <MenuItem value="">Todos</MenuItem>
                {availableResourceTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Data Inicial"
              type="datetime-local"
              size="small"
              value={filters.date_from ? new Date(filters.date_from).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            
            <TextField
              label="Data Final"
              type="datetime-local"
              size="small"
              value={filters.date_to ? new Date(filters.date_to).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Atualizar">
                <IconButton onClick={loadLogs} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Limpar Logs Antigos">
                <IconButton onClick={() => setShowCleanupDialog(true)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </StyledCard>

        {/* Tabela de Logs */}
        <StyledCard sx={{ p: 0 }}>
          <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data/Hora</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell>Ação</TableCell>
                <TableCell>Recurso</TableCell>
                <TableCell>Método</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {log.user_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        @{log.username}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.action}
                      color={getActionColor(log.action)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {log.resource_type}
                      </Typography>
                      {log.resource_id && (
                        <Typography variant="caption" color="textSecondary">
                          ID: {log.resource_id}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.method} variant="outlined" size="small" />
                  </TableCell>
                  <TableCell>
                    {log.response_status && (
                      <Chip
                        label={log.response_status}
                        color={getStatusColor(log.response_status)}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {log.ip_address}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Ver Detalhes">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(log)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={totalLogs}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
            }
          />
        </TableContainer>
        </StyledCard>

        {/* Diálogo de Detalhes */}
        <Dialog
          open={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Detalhes do Log</DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 300px' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Usuário
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedLog.user_name} (@{selectedLog.username})
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: '1 1 300px' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Data/Hora
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {formatDate(selectedLog.created_at)}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 300px' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Ação
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedLog.action}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: '1 1 300px' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Método HTTP
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedLog.method}
                    </Typography>
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Endpoint
                  </Typography>
                  <Typography variant="body2" paragraph fontFamily="monospace">
                    {selectedLog.endpoint}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 300px' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      IP Address
                    </Typography>
                    <Typography variant="body2" paragraph fontFamily="monospace">
                      {selectedLog.ip_address}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: '1 1 300px' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Status da Resposta
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedLog.response_status}
                    </Typography>
                  </Box>
                </Box>
                
                {selectedLog.user_agent && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      User Agent
                    </Typography>
                    <Typography variant="body2" paragraph fontFamily="monospace" fontSize="small">
                      {selectedLog.user_agent}
                    </Typography>
                  </Box>
                )}
                
                {selectedLog.request_data && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Dados da Requisição
                    </Typography>
                    <Paper sx={{ 
                      p: 2, 
                      backgroundColor: '#000', 
                      border: '1px solid #333',
                      borderRadius: 1
                    }}>
                      <Typography 
                        variant="body2" 
                        fontFamily="monospace" 
                        fontSize="small"
                        sx={{ color: '#00ff00', margin: 0 }}
                      >
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {selectedLog.request_data}
                        </pre>
                      </Typography>
                    </Paper>
                  </Box>
                )}
                
                {selectedLog.details && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Detalhes
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedLog.details}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDetailDialog(false)}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de Limpeza */}
        <Dialog
          open={showCleanupDialog}
          onClose={() => setShowCleanupDialog(false)}
        >
          <DialogTitle>Limpar Logs Antigos</DialogTitle>
          <DialogContent>
            <Typography paragraph>
              Esta ação irá remover permanentemente todos os logs mais antigos que o número especificado de dias.
            </Typography>
            <TextField
              fullWidth
              type="number"
              label="Dias"
              value={cleanupDays}
              onChange={(e) => setCleanupDays(parseInt(e.target.value))}
              helperText="Logs mais antigos que este número de dias serão removidos"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCleanupDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCleanupLogs}
              color="error"
              variant="contained"
            >
              Limpar Logs
            </Button>
          </DialogActions>
        </Dialog>
      </PageLayout>
  );
};

export default LogsAuditoria;
