import api from './axios';
import type { AuditLog, AuditLogFilter, AuditLogStats } from '../types/audit';

export const auditApi = {
  // Buscar logs com filtros
  getLogs: async (filters?: AuditLogFilter): Promise<AuditLog[]> => {
    const params = new URLSearchParams();
    
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.action) params.append('action', filters.action);
    if (filters?.resource_type) params.append('resource_type', filters.resource_type);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const response = await api.get(`/audit/logs?${params}`);
    return response.data;
  },

  // Obter estatísticas
  getStats: async (userId?: number, days?: number): Promise<AuditLogStats> => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (days) params.append('days', days.toString());
    
    const response = await api.get(`/audit/logs/stats?${params}`);
    return response.data;
  },

  // Obter ações disponíveis
  getAvailableActions: async (): Promise<string[]> => {
    const response = await api.get('/audit/logs/actions');
    return response.data;
  },

  // Obter tipos de recursos disponíveis
  getAvailableResourceTypes: async (): Promise<string[]> => {
    const response = await api.get('/audit/logs/resource-types');
    return response.data;
  },

  // Limpar logs antigos (apenas admin)
  cleanupOldLogs: async (days: number): Promise<{ message: string }> => {
    const response = await api.delete(`/audit/logs/cleanup?days=${days}`);
    return response.data;
  }
};
