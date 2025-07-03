import { useState } from 'react';
import { Box, Typography, Alert, Snackbar } from '@mui/material';
import { NetworkPing } from '@mui/icons-material';
import QueryForm from '../components/LookingGlass/QueryForm';
import QueryResults from '../components/LookingGlass/QueryResults';
import { lookingGlassAPI } from '../api/lookingGlass';
import type { QueryRequest, LookingGlassQuery } from '../types/lookingGlass';
import PageLayout from '../components/PageLayout';

export default function LookingGlass() {
  const [currentQuery, setCurrentQuery] = useState<LookingGlassQuery | undefined>();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleQuerySubmit = async (request: QueryRequest) => {
    try {
      setLoading(true);
      
      // Criar um query objeto temporário para mostrar o estado de loading
      const tempQuery: LookingGlassQuery = {
        id: `temp-${Date.now()}`,
        type: request.type,
        target: request.target,
        router: `Router ${request.routerId}`, // Será atualizado com o nome real
        timestamp: new Date(),
        status: 'pending'
      };
      
      setCurrentQuery(tempQuery);

      // Executar a query
      const response = await lookingGlassAPI.executeQuery(request);
      
      if (response.status === 'success') {
        // Criar um query objeto inicial e deixar o streaming atualizar os dados
        const initialQuery: LookingGlassQuery = {
          id: response.id!,
          type: request.type,
          target: request.target,
          router: `Router ${request.routerId}`, // Nome temporário
          timestamp: new Date(),
          status: 'running' // Definir como running para iniciar o streaming
        };
        
        setCurrentQuery(initialQuery);
        
        setNotification({
          open: true,
          message: 'Consulta iniciada com sucesso!',
          severity: 'success'
        });
      } else {
        setCurrentQuery({
          ...tempQuery,
          status: 'error',
          error: response.error || 'Erro desconhecido'
        });
        
        setNotification({
          open: true,
          message: response.error || 'Erro ao executar consulta',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error executing query:', error);
      
      setCurrentQuery((prev: LookingGlassQuery | undefined) => prev ? {
        ...prev,
        status: 'error',
        error: 'Erro de comunicação com o servidor'
      } : undefined);
      
      setNotification({
        open: true,
        message: 'Erro de comunicação com o servidor',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = (request: QueryRequest) => {
    handleQuerySubmit(request);
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <PageLayout
      title="Network Looking Glass"
      subtitle="Execute consultas de rede (ping, traceroute, BGP lookup e BGP lookup resumido) através dos roteadores configurados"
      icon={<NetworkPing sx={{ fontSize: '2rem' }} />}
    >
      {/* Conteúdo principal */}
      <Box sx={{ mb: 3 }}>
        {/* Formulário de consulta */}
        <QueryForm 
          onQuerySubmit={handleQuerySubmit}
          loading={loading}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* Resultados */}
        <Box sx={{ flex: 1 }}>
          <QueryResults 
            query={currentQuery}
            onRetry={handleRetry}
          />
        </Box>
      </Box>

      {/* Informações adicionais */}
      <Box mt={4}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Dica:</strong> Use endereços IP ou nomes de domínio válidos. 
            Os resultados são executados em tempo real através dos roteadores configurados.
          </Typography>
        </Alert>
      </Box>

      {/* Notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}
