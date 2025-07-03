import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Button
} from '@mui/material';
import {
  ContentCopy,
  Download,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Schedule
} from '@mui/icons-material';
import { lookingGlassAPI } from '../../api/lookingGlass';
import type { LookingGlassQuery, QueryRequest } from '../../types/lookingGlass';

interface QueryResultsProps {
  query?: LookingGlassQuery;
  onRetry?: (request: QueryRequest) => void;
}

export default function QueryResults({ query, onRetry }: QueryResultsProps) {
  const [output, setOutput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const outputRef = useRef<HTMLPreElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (query?.id && query.status === 'running') {
      startStreaming(query.id);
    } else if (query?.output) {
      setOutput(query.output);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [query]);

  const startStreaming = (queryId: string) => {
    setIsStreaming(true);
    setOutput('');

    try {
      const eventSource = lookingGlassAPI.createQueryStream(queryId);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event: MessageEvent) => {
        if (event.data === '[FIM]') {
          eventSource.close();
          setIsStreaming(false);
        } else {
          setOutput(prev => prev + event.data + '\n');
          // Auto-scroll para o final
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsStreaming(false);
      };
    } catch (error) {
      console.error('Error starting stream:', error);
      setIsStreaming(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      // Aqui poderia mostrar um toast de sucesso
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadResult = () => {
    if (!output || !query) return;

    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `looking-glass-${query.type}-${query.target}-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = () => {
    switch (query?.status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'running':
      case 'pending':
        return <CircularProgress size={20} />;
      default:
        return <Schedule color="disabled" />;
    }
  };

  const getStatusColor = () => {
    switch (query?.status) {
      case 'completed':
        return 'success' as const;
      case 'error':
        return 'error' as const;
      case 'running':
        return 'warning' as const;
      default:
        return 'default' as const;
    }
  };

  const handleRetry = () => {
    if (query && onRetry) {
      const request: QueryRequest = {
        type: query.type,
        target: query.target,
        routerId: parseInt(query.router) // Assumindo que router é o ID
      };
      onRetry(request);
    }
  };

  if (!query) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Selecione os parâmetros acima e clique em "Executar Consulta" para ver os resultados
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header com informações da query */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                {query.type.toUpperCase()} para {query.target}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Executado em: {new Date(query.timestamp).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Roteador: {query.router}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                icon={getStatusIcon()}
                label={query.status}
                color={getStatusColor()}
                variant="outlined"
              />
            </Box>
          </Box>

          {/* Ações */}
          <Box display="flex" gap={1} flexWrap="wrap">
            <Tooltip title="Copiar resultado">
              <IconButton
                onClick={copyToClipboard}
                disabled={!output}
                size="small"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Download resultado">
              <IconButton
                onClick={downloadResult}
                disabled={!output}
                size="small"
              >
                <Download fontSize="small" />
              </IconButton>
            </Tooltip>

            {query.status === 'error' && (
              <Button
                startIcon={<Refresh />}
                onClick={handleRetry}
                size="small"
                variant="outlined"
              >
                Tentar novamente
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Área de resultado */}
      {query.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Erro:</strong> {query.error}
          </Typography>
        </Alert>
      )}

      {(output || isStreaming) && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Resultado:
            {isStreaming && (
              <Chip
                icon={<CircularProgress size={16} />}
                label="Executando..."
                size="small"
                color="warning"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          
          <Paper
            variant="outlined"
            sx={{
              backgroundColor: '#1e1e1e',
              color: '#ffffff',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '0.875rem',
              maxHeight: '600px',
              overflow: 'auto',
              p: 2
            }}
          >
            <pre
              ref={outputRef}
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {output}
              {isStreaming && <span className="cursor">▋</span>}
            </pre>
          </Paper>
        </Box>
      )}

      {/* Estado de loading inicial */}
      {(query.status === 'pending' || query.status === 'running') && !output && !isStreaming && (
        <Box display="flex" alignItems="center" justifyContent="center" py={4}>
          <CircularProgress sx={{ mr: 2 }} />
          <Typography>
            {query.status === 'pending' ? 'Iniciando consulta...' : 'Executando consulta...'}
          </Typography>
        </Box>
      )}

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .cursor {
          animation: blink 1s infinite;
        }
      `}</style>
    </Paper>
  );
}
