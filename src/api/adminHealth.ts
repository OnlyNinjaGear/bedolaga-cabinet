import apiClient from './client';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
}

export interface SystemHealthResponse {
  overall: 'healthy' | 'degraded' | 'down';
  database: HealthStatus;
  redis: HealthStatus;
  api: HealthStatus;
  bot: HealthStatus;
  uptime_seconds: number;
  memory_used_mb: number;
  memory_total_mb: number;
  cpu_percent: number;
  version: string;
  last_checked: string;
}

export const adminHealthApi = {
  getHealth: async (): Promise<SystemHealthResponse | null> => {
    try {
      const response = await apiClient.get<SystemHealthResponse>('/cabinet/admin/health');
      return response.data;
    } catch {
      return null;
    }
  },
};
