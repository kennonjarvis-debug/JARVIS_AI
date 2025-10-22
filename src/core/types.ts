export interface ModuleCommand {
  module: string;
  action: string;
  params: Record<string, any>;
}

export interface ModuleResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'down';
  message?: string;
  latency?: number;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'down';
  services: {
    aiDawgBackend: ServiceHealth;
    aiDawgDocker: ServiceHealth;
    vocalCoach: ServiceHealth;
    producer: ServiceHealth;
    aiBrain: ServiceHealth;
    postgres: ServiceHealth;
    redis: ServiceHealth;
  };
  timestamp: string;
}

export interface AuthRequest extends Request {
  authenticated?: boolean;
}
