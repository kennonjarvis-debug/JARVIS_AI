import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  token?: string;
}

export interface RunCommandRequest {
  cmd: string;
}

export interface ReadFileRequest {
  path: string;
}

export interface WriteFileRequest {
  path: string;
  content: string;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  code?: number;
}

export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface FileWriteResult {
  success: boolean;
  path?: string;
  size?: number;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
}

export interface BridgeConfig {
  port: number;
  bearerToken: string;
  allowedCommands: string[];
  allowedPaths: string[];
  maxFileSize: number;
}
