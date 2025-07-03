export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  method: string;
  endpoint: string;
  ip_address?: string;
  user_agent?: string;
  request_data?: string;
  response_status?: number;
  details?: string;
  created_at: string;
  user_name?: string;
  username?: string;
}

export interface AuditLogFilter {
  user_id?: number;
  action?: string;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  total_actions: number;
  login_count: number;
  create_count: number;
  update_count: number;
  delete_count: number;
  last_login?: string;
}
