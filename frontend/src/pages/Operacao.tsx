import { useEffect, useState, useRef } from 'react';
// Hook para streaming SSE
function useSSEStream(url: string | null, onFinish?: (output: string) => void) {
  const [output, setOutput] = useState('');
  const outputRef = useRef('');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;
    setOutput('');
    outputRef.current = '';
    const es = new window.EventSource(url);
    eventSourceRef.current = es;
    es.onmessage = (event) => {
      // console.log('[SSE] Mensagem recebida:', event.data); // DEBUG REMOVIDO
      if (event.data.trim() === '[FIM]') {
        es.close();
        if (onFinish) onFinish(outputRef.current);
      } else {
        outputRef.current += event.data + '\n';
        setOutput(outputRef.current);
      }
    };
    es.onerror = () => {
      es.close();
      if (onFinish) onFinish(outputRef.current);
    };
    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  return output;
}

import { Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel, CircularProgress, Autocomplete, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import DataTable from '../components/DataTable';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import { IconButton, Tooltip } from '@mui/material';
import Backdrop from '@mui/material/Backdrop';
import api from '../api/axios';


interface Peering {
  id: number;
  name?: string;
  ip: string;
  router_id: number;
  group_id?: number;
  version: 4 | 6;
  remote_asn?: number;
  remote_asn_name?: string;
}

interface Router {
  id: number;
  name: string;
  asn?: number;
}

interface Group {
  id: number;
  name: string;
  router_id?: number;
  peering_ids?: number[];
}

export default function Operacao() {
  const [routers, setRouters] = useState<Router[]>([]);
  const [peerings, setPeerings] = useState<Peering[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedRouter, setSelectedRouter] = useState<number | ''>('');
  const [operationType, setOperationType] = useState<'individual' | 'group' | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusDialog, setStatusDialog] = useState<{open: boolean, loading: boolean, result: string, status: string, peer: string}|null>(null);
  // Novo estado para modal de prefixos anunciados
  const [prefixDialog, setPrefixDialog] = useState<{
    open: boolean,
    loading: boolean,
    result: string,
    peer: string,
    version: 4 | 6,
    name?: string
  } | null>(null);
  // Função para consultar prefixos anunciados
  const handleConsultarPrefixos = async (peerIp: string, version: 4 | 6) => {
    // Busca o nome do peering correspondente
    const safePeerings = Array.isArray(peerings) ? peerings : [];
    const peering = safePeerings.find(p => p.ip === peerIp && p.version === version);
    setPrefixDialog({open: true, loading: true, result: '', peer: peerIp, version, name: peering?.name});
    try {
      const res = await api.get(`/routers/${selectedRouter}/bgp-advertised-prefixes`, { params: { peer_ip: peerIp, version } });
      setPrefixDialog({open: true, loading: false, result: res.data.output || res.data, peer: peerIp, version, name: peering?.name});
    } catch {
      setPrefixDialog({open: true, loading: false, result: 'Erro ao consultar prefixos anunciados.', peer: peerIp, version, name: peering?.name});
    }
  };
  const [actionDialog, setActionDialog] = useState<{open: boolean, action: 'enable' | 'disable', peering: Peering | null, grupo: any | null, router: Router | null} | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{open: boolean, success: boolean, message: string}|null>(null);
  const [actionOutput, setActionOutput] = useState<string | null>(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  // Novo estado para modal de execução em tempo real
  const [liveModal, setLiveModal] = useState<{open: boolean, output: string, finished: boolean}>({open: false, output: '', finished: false});

  // Adiciona token JWT na query string para SSE
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  // Use o proxy nginx para SSE
  const apiBase = '/api';
  let streamUrlWithToken = null;
  if (streamUrl && token) {
    let url = streamUrl;
    if (!streamUrl.startsWith('http')) {
      url = apiBase + streamUrl;
    }
    streamUrlWithToken = `${url}${url.includes('?') ? '&' : '?'}token=${token}`;
  }
  // Hook SSE para execução em tempo real
  function useLiveSSEStream(url: string | null) {
    useEffect(() => {
      if (!url) return;
      setLiveModal({open: true, output: '', finished: false});
      const outputRef = { current: '' };
      const es = new window.EventSource(url);
      es.onmessage = (event) => {
        let data = event.data;
        // Remove linhas que começam com '$ '
        if (data.trim().startsWith('$ ')) return;
        if (data.trim() === '[FIM]') {
          es.close();
          setLiveModal(prev => ({...prev, finished: true}));
        } else {
          outputRef.current += data + '\n';
          setLiveModal(prev => ({...prev, output: outputRef.current}));
        }
      };
      es.onerror = () => {
        es.close();
        setLiveModal(prev => ({...prev, finished: true}));
      };
      return () => {
        es.close();
      };
    }, [url]);
  }

  useSSEStream(streamUrlWithToken, (finalOutput) => {
    setActionFeedback({ open: true, success: true, message: 'Ação realizada com sucesso!' });
    setActionOutput(finalOutput);
    setExecutingAction(false);
    setLiveModal({open: false, output: '', finished: false});
  });

  // Use o hook apenas quando streamUrlWithToken mudar
  useLiveSSEStream(streamUrlWithToken);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/routers/'),
      api.get('/peerings/'),
      api.get('/peering-groups/'),
    ])
      .then(([routersRes, peeringsRes, groupsRes]) => {
        setRouters(routersRes.data);
        // Mapeia o campo type para version (4 ou 6)
        const peeringsFixed = peeringsRes.data.map((p: any) => ({
          ...p,
          version: p.type === 'IPv4' ? 4 : p.type === 'IPv6' ? 6 : undefined,
        }));
        setPeerings(peeringsFixed);
        setGroups(groupsRes.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar dados.');
        setLoading(false);
      });
  }, []);

  // Filtragem
  const filteredPeerings = peerings.filter(p =>
    selectedRouter !== '' && p.router_id === selectedRouter &&
    (operationType === 'individual' ? !p.group_id : !!p.group_id)
  );
  // Filtros removidos do estado, agora DataTable faz o filtro global
  const peeringsV4 = filteredPeerings.filter(p => p.version === 4);
  const peeringsV6 = filteredPeerings.filter(p => p.version === 6);

  // Para operação de grupo, filtra grupos do roteador selecionado
  const [searchGroup, setSearchGroup] = useState('');
  const gruposDoRouter = groups.filter(g => String(g.router_id) === String(selectedRouter));
  const gruposFiltrados = gruposDoRouter.filter(g =>
    !searchGroup || g.name.toLowerCase().includes(searchGroup.toLowerCase())
  );

  // Função para consultar status do peer
  const handleConsultarStatus = async (peerIp: string) => {
    setStatusDialog({open: true, loading: true, result: '', status: '', peer: peerIp});
    try {
      // Supondo endpoint: /routers/{router_id}/bgp-status?peer_ip=<ip>
      const res = await api.get(`/routers/${selectedRouter}/bgp-status`, { params: { peer_ip: peerIp } });
      const output = res.data.output || res.data;
      // Parse do status
      let status = '-';
      if (/Established/.test(output)) status = 'UP';
      else if (/Idle\(Admin\)/.test(output)) status = 'SHUTDOWN';
      else if (/Idle/.test(output)) status = 'Down';
      setStatusDialog({open: true, loading: false, result: output, status, peer: peerIp});
    } catch {
      setStatusDialog({open: true, loading: false, result: 'Erro ao consultar status.', status: '-', peer: peerIp});
    }
  };

  // Função para abrir modal de ação
  const handleAction = (action: 'enable' | 'disable', peerIp: string) => {
    const safePeerings = Array.isArray(peerings) ? peerings : [];
    const safeRouters = Array.isArray(routers) ? routers : [];
    const peering = safePeerings.find(p => p.ip === peerIp) || null;
    const router = safeRouters.find(r => r.id === selectedRouter) || null;
    setActionDialog({ open: true, action, peering, grupo: null, router });
  };

  return (
    <Box sx={{ minHeight: '100vh', p: { xs: 1, sm: 4 }, background: 'linear-gradient(135deg, #181c24 0%, #232a36 100%)' }}>
      {/* Backdrop de execução de ação - agora antes dos Dialogs */}
      <Backdrop open={executingAction} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 10 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>Aguarde, executando ação...</Typography>
        </Box>
      </Backdrop>
      <Typography variant="h4" color="primary" fontWeight={800} align="center" sx={{ mb: 4, mt: 2, letterSpacing: 1 }}>
        Operação de Sessões BGP
      </Typography>
      <Paper sx={{ p: 3, borderRadius: 4, width: { xs: '100%', sm: 700 }, maxWidth: '100%', mx: 'auto', mb: 4, background: 'rgba(33, 53, 71, 0.18)' }}>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Autocomplete
            options={routers}
            getOptionLabel={(option: Router) => option.name}
            value={(Array.isArray(routers) ? routers : []).find(r => r.id === selectedRouter) || null}
            onChange={(_event: React.SyntheticEvent, value: Router | null) => setSelectedRouter(value ? value.id : '')}
            renderInput={(params: any) => <TextField {...params} label="Selecione o Roteador" />}
            sx={{ flex: 1 }}
            isOptionEqualToValue={(option: Router, value: Router) => option.id === value.id}
          />
          <FormControl fullWidth sx={{ flex: 1 }}>
            <InputLabel id="operation-type-label">Tipo de Operação</InputLabel>
            <Select
              labelId="operation-type-label"
              value={operationType}
              label="Tipo de Operação"
              onChange={(e: SelectChangeEvent<string>) => setOperationType(e.target.value as 'individual' | 'group')}
              disabled={selectedRouter === ''}
            >
              <MenuItem value="individual">Peering Individual</MenuItem>
              <MenuItem value="group">Grupo de Peerings</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : error ? (
        <Typography color="error" align="center">{error}</Typography>
      ) : (
        selectedRouter !== '' && operationType !== '' && (
          <>
            {operationType === "group" ? (
              <>
                <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 2 }}>Grupos de Peerings</Typography>
                <TextField
                  label="Pesquisar grupo"
                  value={searchGroup}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchGroup(e.target.value)}
                  size="small"
                  sx={{ mb: 2, width: 320 }}
                  placeholder="Nome do grupo..."
                />
                <DataTable
                  columns={[
                    { id: 'name', label: 'Nome do Grupo', minWidth: 140 },
                    {
                      id: 'actions',
                      label: 'Ações',
                      minWidth: 120,
                      format: (_: any, row: any) => {
                        const safePeerings = Array.isArray(peerings) ? peerings : [];
                        const safeRouters = Array.isArray(routers) ? routers : [];
                        const ips = safePeerings.filter(p => row.peering_ids?.includes(p.id)).map(p => p.ip);
                        return (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Consultar status">
                              <span>
                                <IconButton color="primary" size="small" onClick={() => handleConsultarStatus(ips.join('|'))} disabled={ips.length === 0}>
                                  <VisibilityIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Ativar sessões">
                              <span>
                                <IconButton color="success" size="small" onClick={() => {
                                  const router = safeRouters.find(r => r.id === selectedRouter) || null;
                                  setActionDialog({ open: true, action: 'enable', peering: null, grupo: row, router });
                                }} disabled={ips.length === 0}>
                                  <CheckCircleIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Desativar sessões">
                              <span>
                                <IconButton color="error" size="small" onClick={() => {
                                  const router = safeRouters.find(r => r.id === selectedRouter) || null;
                                  setActionDialog({ open: true, action: 'disable', peering: null, grupo: row, router });
                                }} disabled={ips.length === 0}>
                                  <BlockIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        );
                      }
                    }
                  ]}
                  rows={gruposFiltrados}
                />
              </>
            ) : (
              <>
                <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mb: 4 }}>
                  <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 2, textAlign: 'left' }}>IPv4</Typography>
                  <DataTable
                    columns={[
                      { id: 'name', label: 'Nome', minWidth: 120 },
                      { id: 'ip', label: 'IP', minWidth: 120 },
                      { id: 'remote_asn', label: 'ASN Remoto', minWidth: 100 },
                      { id: 'remote_asn_name', label: 'Nome ASN Remoto', minWidth: 140 },
                      {
                        id: 'actions',
                        label: 'Ações',
                        minWidth: 180,
                        format: (_: any, row: any) => (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Consultar status">
                              <IconButton color="primary" size="small" onClick={() => handleConsultarStatus(row.ip)}>
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ver prefixos anunciados">
                              <IconButton color="info" size="small" onClick={() => handleConsultarPrefixos(row.ip, 4)}>
                                <span role="img" aria-label="prefixos">📡</span>
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )
                      }
                    ]}
                    rows={peeringsV4}
                    filterPlaceholder="Buscar..."
                  />
                </Box>
                <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mb: 4 }}>
                  <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 2, textAlign: 'left' }}>IPv6</Typography>
                  <DataTable
                    columns={[
                      { id: 'name', label: 'Nome', minWidth: 120 },
                      { id: 'ip', label: 'IP', minWidth: 120 },
                      { id: 'remote_asn', label: 'ASN Remoto', minWidth: 100 },
                      { id: 'remote_asn_name', label: 'Nome ASN Remoto', minWidth: 140 },
                      {
                        id: 'actions',
                        label: 'Ações',
                        minWidth: 180,
                        format: (_: any, row: any) => (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Consultar status">
                              <IconButton color="primary" size="small" onClick={() => handleConsultarStatus(row.ip)}>
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ver prefixos anunciados">
                              <IconButton color="info" size="small" onClick={() => handleConsultarPrefixos(row.ip, 6)}>
                                <span role="img" aria-label="prefixos">📡</span>
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )
                      }
                    ]}
                    rows={peeringsV6}
                    filterPlaceholder="Buscar..."
                  />
                </Box>
              </>
            )}
          </>
        )
      )}
      {/* Modal de prefixos anunciados */}
      {prefixDialog && (
        <Dialog open={prefixDialog.open} onClose={() => setPrefixDialog(null)} maxWidth="md" fullWidth>
          <DialogTitle>
            Prefixos anunciados para o peer {prefixDialog.name ? `${prefixDialog.name} (${prefixDialog.peer})` : prefixDialog.peer} (IPv{prefixDialog.version})
          </DialogTitle>
          <DialogContent>
            {prefixDialog.loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : null}
            {!prefixDialog.loading && (
              <Box component="pre" sx={{ background: '#222', color: '#fff', p: 2, borderRadius: 2, fontSize: 14, overflow: 'auto' }}>
                {prefixDialog.result}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPrefixDialog(null)} sx={{ fontSize: 14, minHeight: 36, px: 2, py: 0.5 }}>Fechar</Button>
          </DialogActions>
        </Dialog>
      )}
      {/* Modal de status */}
      <Dialog open={!!statusDialog?.open} onClose={() => setStatusDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Resultado da consulta - {
            operationType === 'group'
              ? ((Array.isArray(gruposDoRouter) ? gruposDoRouter : []).find(g => g.peering_ids?.some(id => statusDialog?.peer?.split('|').includes((Array.isArray(peerings) ? peerings : []).find(p => p.id === id)?.ip || '')))?.name || '-')
              : ((Array.isArray(peerings) ? peerings : []).find(p => p.ip === statusDialog?.peer)?.name || statusDialog?.peer)
          }
        </DialogTitle>
        <DialogContent>
          {statusDialog?.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
              <Box component="pre" sx={{ background: '#222', color: '#fff', p: 2, borderRadius: 2, fontSize: 14, overflow: 'auto' }}>
                {statusDialog?.result}
              </Box>
          )}
        </DialogContent>
        <DialogActions>
          {operationType === 'individual' && statusDialog && !statusDialog.loading && (
            <>
              <Button color="success" variant="contained" onClick={() => handleAction('enable', statusDialog.peer)} sx={{ fontSize: 14, minHeight: 36, px: 2, py: 0.5 }}>
                Ativar sessão
              </Button>
              <Button color="error" variant="contained" onClick={() => handleAction('disable', statusDialog.peer)} sx={{ fontSize: 14, minHeight: 36, px: 2, py: 0.5 }}>
                Desativar sessão
              </Button>
            </>
          )}
          <Button onClick={() => setStatusDialog(null)} sx={{ fontSize: 14, minHeight: 36, px: 2, py: 0.5 }}>Fechar</Button>
        </DialogActions>
      </Dialog>
      {/* Modal de ação de ativar/desativar sessão */}
      <Dialog open={!!actionDialog?.open} onClose={() => setActionDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{actionDialog?.action === 'enable' ? (operationType === 'group' ? 'Ativar grupo de peerings BGP' : 'Ativar sessão BGP') : (operationType === 'group' ? 'Desativar grupo de peerings BGP' : 'Desativar sessão BGP')}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Confirme a execução do comando abaixo no roteador <b>{actionDialog?.router?.name}</b>:
          </Typography>
          <Box component="pre" sx={{ background: '#222', color: '#fff', p: 2, borderRadius: 2, fontSize: 15, mb: 2 }}>
            {(actionDialog?.grupo || actionDialog?.peering) ? (
              (() => {
                const safeGrupos = Array.isArray(gruposDoRouter) ? gruposDoRouter : [];
                const safePeerings = Array.isArray(peerings) ? peerings : [];
                
                let grupo: any = null;
                let ips: string[] = [];
                
                if (actionDialog.grupo) {
                  // Operação de grupo - usar o grupo diretamente
                  grupo = actionDialog.grupo;
                  ips = safePeerings.filter(p => grupo?.peering_ids?.includes(p.id)).map(p => p.ip);
                } else if (actionDialog.peering) {
                  // Operação de peering individual - encontrar o grupo
                  grupo = safeGrupos.find(g => g.peering_ids?.includes(actionDialog.peering!.id));
                  ips = safePeerings.filter(p => grupo?.peering_ids?.includes(p.id)).map(p => p.ip);
                }
                const asn = actionDialog.router?.asn;
                const cmd = [
                  'system-view',
                  `bgp ${asn}`,
                  ...ips.map(ip => `${actionDialog.action === 'enable' ? 'undo peer' : 'peer'} ${ip} ignore`),
                  'commit'
                ];
                return cmd.join('\n');
              })()
            ) : (
              actionDialog?.action === 'enable' ?
                `system-view\nbgp ${actionDialog?.router?.asn}\nundo peer ${actionDialog?.peering?.ip} ignore\ncommit`
              :
                `system-view\nbgp ${actionDialog?.router?.asn}\npeer ${actionDialog?.peering?.ip} ignore\ncommit`
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)} sx={{ fontSize: 14, minHeight: 36, px: 2, py: 0.5 }}>Cancelar</Button>
          <Button
            color={actionDialog?.action === 'enable' ? 'success' : 'error'}
            variant="contained"
            onClick={async () => {
              if (!actionDialog?.grupo && !actionDialog?.peering) return;
              setActionOutput(null);
              setExecutingAction(true);
              try {
                if (actionDialog.grupo) {
                  // Operação de grupo
                  const grupo = actionDialog.grupo;
                  setStreamUrl(`/peering-groups/${grupo.id}/bgp-${actionDialog.action}-stream`);
                  setActionDialog(null);
                  setStatusDialog(null);
                  return;
                } else if (actionDialog.peering) {
                  // Operação de peering individual
                  setStreamUrl(`/peerings/${actionDialog.peering.id}/bgp-${actionDialog.action}-stream`);
                  setActionDialog(null);
                  setStatusDialog(null);
                  return;
                }
              } catch (e: any) {
                setActionDialog(null);
                let output = '';
                let message = 'Erro ao executar ação.';
                if (e?.response) {
                  if (typeof e.response.data === 'object') {
                    output = e.response.data.output || JSON.stringify(e.response.data, null, 2);
                    message = e.response.data.detail || message;
                  } else if (typeof e.response.data === 'string') {
                    output = e.response.data;
                  }
                } else if (e?.message) {
                  output = e.message;
                }
                setActionFeedback({ open: true, success: false, message });
                setActionOutput(output);
                setExecutingAction(false);
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      {/* Modal de feedback de ação + output */}
      <Dialog open={!!actionFeedback?.open} onClose={() => { setActionFeedback(null); setActionOutput(null); setStreamUrl(null); }} maxWidth="md" fullWidth>
        <DialogTitle>{actionFeedback?.success ? 'Sucesso' : 'Erro'}</DialogTitle>
        <DialogContent>
          <Typography color={actionFeedback?.success ? 'success.main' : 'error.main'} sx={{ mb: 2 }}>
            {actionFeedback?.message}
          </Typography>
          <Box component="pre" sx={{ background: '#222', color: '#fff', p: 2, borderRadius: 2, fontSize: 14, overflow: 'auto', minHeight: 80 }}>
            {actionOutput !== null ?
              actionOutput
                .split('\n')
                .filter(line => !line.trim().startsWith('$ '))
                .join('\n')
              : '[Sem output do backend]'}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActionFeedback(null); setActionOutput(null); setStreamUrl(null); }}>Fechar</Button>
        </DialogActions>
      </Dialog>
      {/* Modal de execução em tempo real */}
      <Dialog open={liveModal.open} maxWidth="md" fullWidth>
        <DialogTitle>Executando comandos no roteador...</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Acompanhe a execução em tempo real:</Typography>
          <Box component="pre" sx={{ background: '#222', color: '#fff', p: 2, borderRadius: 2, fontSize: 15, minHeight: 120, maxHeight: 400, overflow: 'auto' }}>
            {liveModal.output || 'Aguardando retorno do roteador...'}
          </Box>
        </DialogContent>
        <DialogActions>
          {liveModal.finished && (
            <Button onClick={() => setLiveModal({open: false, output: '', finished: false})}>Fechar</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
