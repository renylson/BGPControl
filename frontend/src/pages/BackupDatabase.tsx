import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Card,
  CardContent,
  Snackbar,
  LinearProgress
} from '@mui/material';
import {
  CloudDownload as DownloadIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  CleaningServices as CleanupIcon
} from '@mui/icons-material';

// Componentes padronizados
import PageLayout from '../components/PageLayout';
import StyledCard from '../components/StyledCard';

// API e tipos
import { backupApi } from '../api/backup';
import type { BackupInfo, BackupStatus } from '../api/backup';

const BackupDatabase: React.FC = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados dos diálogos
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  
  // Estados dos formulários
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [cleanupDays, setCleanupDays] = useState(30);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [backupsData, statusData] = await Promise.all([
        backupApi.listBackups(),
        backupApi.getBackupStatus()
      ]);
      
      if (backupsData.success) {
        setBackups(backupsData.backups);
      }
      setStatus(statusData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const response = await backupApi.createBackup();
      if (response.success) {
        setSuccess('Backup criado com sucesso!');
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (backup: BackupInfo) => {
    try {
      const blob = await backupApi.downloadBackup(backup.id);
      
      // Criar URL do blob e fazer download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backup.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Download iniciado!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao fazer download');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup || !confirmReplace) return;

    try {
      const response = await backupApi.restoreBackup({
        backup_id: selectedBackup.id,
        confirm_replace: confirmReplace
      });
      
      if (response.success) {
        setSuccess('Banco de dados restaurado com sucesso!');
        setShowRestoreDialog(false);
        setConfirmReplace(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao restaurar backup');
    }
  };

  const handleUploadRestore = async () => {
    if (!uploadFile || !confirmReplace) return;

    // Validação adicional de tipo de arquivo
    const allowedExtensions = ['.sql', '.sql.gz'];
    const isValidFile = allowedExtensions.some(ext => uploadFile.name.toLowerCase().endsWith(ext));
    
    if (!isValidFile) {
      setError('Apenas arquivos .sql ou .sql.gz são permitidos');
      return;
    }

    try {
      const response = await backupApi.uploadAndRestore(uploadFile, confirmReplace);
      
      if (response.success) {
        setSuccess('Banco de dados restaurado a partir do upload!');
        setShowUploadDialog(false);
        setUploadFile(null);
        setConfirmReplace(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao restaurar backup do upload');
    }
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;

    try {
      const response = await backupApi.deleteBackup(selectedBackup.id);
      if (response.success) {
        setSuccess('Backup removido com sucesso!');
        setShowDeleteDialog(false);
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao remover backup');
    }
  };

  const handleCleanupBackups = async () => {
    try {
      const response = await backupApi.cleanupOldBackups(cleanupDays);
      if (response.success) {
        setSuccess(response.message);
        setShowCleanupDialog(false);
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro na limpeza de backups');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  return (
    <PageLayout title="Backup do Banco de Dados" icon={<StorageIcon />}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Cards de status */}
        {status && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Card sx={{ flex: 1, minWidth: 200 }}>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {status.total_backups}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total de Backups
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 200 }}>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {status.total_size_human}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Espaço Usado
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 200 }}>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {status.available_space_human}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Espaço Disponível
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 200 }}>
              <CardContent>
                <Typography variant="h6" color="info.main">
                  {status.newest_backup ? formatDate(status.newest_backup) : 'Nenhum'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Último Backup
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Ações principais */}
        <StyledCard>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={creating ? <CircularProgress size={20} /> : <AddIcon />}
                onClick={handleCreateBackup}
                disabled={creating}
              >
                {creating ? 'Criando...' : 'Criar Backup'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setShowUploadDialog(true)}
              >
                Fazer Upload e Restaurar
              </Button>

              <Button
                variant="outlined"
                startIcon={<CleanupIcon />}
                onClick={() => setShowCleanupDialog(true)}
              >
                Limpeza de Backups
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                disabled={loading}
              >
                Atualizar
              </Button>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome do Arquivo</TableCell>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell>Criado por</TableCell>
                    <TableCell>Tamanho</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhum backup encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {backup.filename}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(backup.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={backup.created_by} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {backup.size_human}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Download">
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadBackup(backup)}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Restaurar">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  setShowRestoreDialog(true);
                                }}
                              >
                                <RestoreIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </StyledCard>
        </Box>

      {/* Dialog de Restauração */}
      <Dialog open={showRestoreDialog} onClose={() => setShowRestoreDialog(false)}>
        <DialogTitle>Restaurar Backup</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>⚠️ ATENÇÃO:</strong> Esta operação irá substituir completamente todos os dados 
            atuais do banco de dados pelo conteúdo do backup selecionado.
          </DialogContentText>
          {selectedBackup && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Arquivo:</strong> {selectedBackup.filename}
              </Typography>
              <Typography variant="body2">
                <strong>Data:</strong> {formatDate(selectedBackup.created_at)}
              </Typography>
              <Typography variant="body2">
                <strong>Tamanho:</strong> {selectedBackup.size_human}
              </Typography>
            </Box>
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmReplace}
                onChange={(e) => setConfirmReplace(e.target.checked)}
              />
            }
            label="Confirmo que desejo substituir todos os dados atuais"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRestoreDialog(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleRestoreBackup}
            variant="contained"
            color="warning"
            disabled={!confirmReplace}
          >
            Restaurar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Upload e Restauração */}
      <Dialog open={showUploadDialog} onClose={() => setShowUploadDialog(false)}>
        <DialogTitle>Upload e Restauração</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Selecione um arquivo de backup SQL (.sql ou .sql.gz) para restaurar o banco de dados.
          </DialogContentText>
          <input
            type="file"
            accept=".sql,.sql.gz,application/sql,application/gzip"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                const allowedExtensions = ['.sql', '.sql.gz'];
                const isValidFile = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
                
                if (!isValidFile) {
                  setError('Apenas arquivos .sql ou .sql.gz são permitidos');
                  setUploadFile(null);
                  e.target.value = ''; // Limpar o input
                } else {
                  setError(null);
                  setUploadFile(file);
                }
              } else {
                setUploadFile(null);
              }
            }}
            style={{ margin: '16px 0' }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmReplace}
                onChange={(e) => setConfirmReplace(e.target.checked)}
              />
            }
            label="Confirmo que desejo substituir todos os dados atuais"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDialog(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleUploadRestore}
            variant="contained"
            color="warning"
            disabled={!uploadFile || !confirmReplace}
          >
            Restaurar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Exclusão */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Excluir Backup</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir este backup? Esta ação não pode ser desfeita.
          </DialogContentText>
          {selectedBackup && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Arquivo:</strong> {selectedBackup.filename}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteBackup} color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Limpeza */}
      <Dialog open={showCleanupDialog} onClose={() => setShowCleanupDialog(false)}>
        <DialogTitle>Limpeza de Backups Antigos</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove backups mais antigos que o número de dias especificado.
          </DialogContentText>
          <TextField
            label="Dias para manter"
            type="number"
            value={cleanupDays}
            onChange={(e) => setCleanupDays(Number(e.target.value))}
            fullWidth
            margin="normal"
            inputProps={{ min: 1, max: 365 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCleanupDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCleanupBackups} color="primary">
            Executar Limpeza
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars para feedback */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
};

export default BackupDatabase;
