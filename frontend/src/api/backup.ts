/**
 * API para gerenciamento de backup e restore do banco de dados
 */
import api from './axios';

export interface BackupInfo {
  id: string;
  filename: string;
  created_at: string;
  created_by: string;
  size_bytes: number;
  size_human: string;
  description?: string;
}

export interface BackupResponse {
  success: boolean;
  message: string;
  backup_info?: BackupInfo;
}

export interface BackupListResponse {
  success: boolean;
  backups: BackupInfo[];
}

export interface RestoreRequest {
  backup_id: string;
  confirm_replace: boolean;
}

export interface RestoreResponse {
  success: boolean;
  message: string;
}

export interface BackupStatus {
  backup_directory: string;
  total_backups: number;
  total_size_bytes: number;
  total_size_human: string;
  oldest_backup?: string;
  newest_backup?: string;
  available_space_bytes: number;
  available_space_human: string;
}

export const backupApi = {
  // Criar backup
  createBackup: async (): Promise<BackupResponse> => {
    const response = await api.post('/database-backup/create');
    return response.data;
  },

  // Listar backups
  listBackups: async (): Promise<BackupListResponse> => {
    const response = await api.get('/database-backup/list');
    return response.data;
  },

  // Download de backup
  downloadBackup: async (backupId: string): Promise<Blob> => {
    const response = await api.get(`/database-backup/download/${backupId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Restaurar backup
  restoreBackup: async (request: RestoreRequest): Promise<RestoreResponse> => {
    const response = await api.post('/database-backup/restore', request);
    return response.data;
  },

  // Upload e restaurar
  uploadAndRestore: async (file: File, confirmReplace: boolean): Promise<RestoreResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confirm_replace', confirmReplace.toString());

    const response = await api.post('/database-backup/upload-restore', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Deletar backup
  deleteBackup: async (backupId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/database-backup/delete/${backupId}`);
    return response.data;
  },

  // Limpeza de backups antigos
  cleanupOldBackups: async (daysToKeep: number = 30): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/database-backup/cleanup?days_to_keep=${daysToKeep}`);
    return response.data;
  },

  // Status do sistema de backup
  getBackupStatus: async (): Promise<BackupStatus> => {
    const response = await api.get('/database-backup/status');
    return response.data;
  }
};
