/**
 * API client para gerenciamento de logs de auditoria e limpeza
 */

import api from './axios';

export interface AuditStats {
  total_logs: number;
  oldest_log_date: string | null;
  newest_log_date: string | null;
  logs_by_action: Record<string, number>;
  logs_by_month: Record<string, number>;
  size_estimation_mb: number;
}

export interface CleanupResult {
  success: boolean;
  message: string;
  deleted_count: number;
  freed_space_mb: number;
  oldest_remaining_date: string | null;
  cleanup_date: string;
}

export interface AutoCleanupResult {
  success: boolean;
  message: string;
  cleanup_result: CleanupResult;
}

class AuditCleanupAPI {
  /**
   * Obter estatísticas dos logs de auditoria
   */
  async getStats(): Promise<{ success: boolean; stats: AuditStats }> {
    const response = await api.get('/audit-cleanup/stats');
    return response.data;
  }

  /**
   * Executar limpeza manual de logs antigos
   */
  async cleanupOldLogs(monthsToKeep: number = 6): Promise<CleanupResult> {
    const response = await api.post('/audit-cleanup/cleanup', null, {
      params: { months_to_keep: monthsToKeep }
    });
    return response.data;
  }

  /**
   * Configurar limpeza automática
   */
  async enableAutoCleanup(monthsToKeep: number = 6): Promise<AutoCleanupResult> {
    const response = await api.post('/audit-cleanup/auto-cleanup', null, {
      params: { months_to_keep: monthsToKeep }
    });
    return response.data;
  }
}

export const auditCleanupApi = new AuditCleanupAPI();
