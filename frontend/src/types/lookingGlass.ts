export interface LookingGlassQuery {
  id?: string;
  type: 'ping' | 'traceroute' | 'bgp' | 'bgp-summary';
  target: string;
  router: string;
  timestamp: Date;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: string;
  error?: string;
}

export interface Router {
  id: number;
  name: string;
  hostname: string;
  location: string;
  status: 'online' | 'offline';
  ip_origens?: Array<{
    id: number;
    name: string;
    type: string;
    ip: string;
  }>;
}

export interface QueryRequest {
  type: 'ping' | 'traceroute' | 'bgp' | 'bgp-summary';
  target: string;
  routerId: number;
  options?: {
    count?: number;
    timeout?: number;
    maxHops?: number; // Para traceroute
    sourceIp?: string; // IP de origem para ping/traceroute
    ipVersion?: 4 | 6; // Versão do IP
  };
}

export interface QueryResponse {
  id: string;
  status: 'success' | 'error';
  data?: string;
  error?: string;
  executionTime?: number;
}

export const QUERY_TYPES = [
  { value: 'ping', label: 'Ping' },
  { value: 'traceroute', label: 'Traceroute' },
  { value: 'bgp', label: 'BGP Lookup' },
  { value: 'bgp-summary', label: 'BGP Lookup (Resumido)' }
] as const;
