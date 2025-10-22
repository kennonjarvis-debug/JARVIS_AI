/**
 * Integration adapter type definitions
 * @module types/integrations
 */

import { z } from 'zod';

/**
 * Base interface for all integration adapters
 */
export interface Integration {
  /** Integration name/identifier */
  name: string;
  /** Whether the integration is currently connected */
  isConnected: boolean;
  /** Test the connection to the integration */
  testConnection(): Promise<boolean>;
  /** Disconnect and cleanup */
  disconnect(): Promise<void>;
}

/**
 * Supabase configuration
 */
export interface SupabaseConfig {
  /** Supabase project URL */
  url: string;
  /** Anonymous/public key */
  anonKey: string;
  /** Service role key (admin access) */
  serviceKey?: string;
}

/**
 * Zod schema for SupabaseConfig
 */
export const SupabaseConfigSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
  serviceKey: z.string().min(1).optional(),
});

/**
 * n8n workflow configuration
 */
export interface N8nConfig {
  /** n8n instance API URL */
  apiUrl: string;
  /** n8n API key */
  apiKey: string;
}

/**
 * Zod schema for N8nConfig
 */
export const N8nConfigSchema = z.object({
  apiUrl: z.string().url(),
  apiKey: z.string().min(1),
});

/**
 * n8n workflow execution status
 */
export interface WorkflowExecution {
  /** Execution ID */
  id: string;
  /** Workflow ID that was executed */
  workflowId: string;
  /** Current execution status */
  status: 'running' | 'success' | 'error';
  /** Execution result data */
  data?: any;
  /** When execution started */
  startedAt: Date;
  /** When execution finished (if completed) */
  finishedAt?: Date;
  /** Error message if failed */
  error?: string;
}

/**
 * Zod schema for WorkflowExecution
 */
export const WorkflowExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.enum(['running', 'success', 'error']),
  data: z.any().optional(),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  error: z.string().optional(),
});

/**
 * Buffer social media configuration
 */
export interface BufferConfig {
  /** Buffer access token */
  accessToken: string;
  /** Profile IDs for each platform */
  profileIds: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

/**
 * Zod schema for BufferConfig
 */
export const BufferConfigSchema = z.object({
  accessToken: z.string().min(1),
  profileIds: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    facebook: z.string().optional(),
  }),
});

/**
 * Social media post structure
 */
export interface SocialPost {
  /** Post text content */
  text: string;
  /** Media attachments */
  media?: Array<{
    /** Media URL */
    url: string;
    /** Alt text for accessibility */
    alt?: string;
  }>;
  /** When to schedule the post */
  scheduledAt?: Date;
  /** Profile IDs to post to */
  profiles: string[];
}

/**
 * Zod schema for SocialPost
 */
export const SocialPostSchema = z.object({
  text: z.string().min(1),
  media: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
      })
    )
    .optional(),
  scheduledAt: z.date().optional(),
  profiles: z.array(z.string()),
});

/**
 * HubSpot CRM configuration
 */
export interface HubSpotConfig {
  /** HubSpot access token */
  accessToken: string;
  /** HubSpot portal/account ID */
  portalId: string;
}

/**
 * Zod schema for HubSpotConfig
 */
export const HubSpotConfigSchema = z.object({
  accessToken: z.string().min(1),
  portalId: z.string().min(1),
});

/**
 * HubSpot contact
 */
export interface Contact {
  /** Contact ID (if existing) */
  id?: string;
  /** Email address */
  email: string;
  /** First name */
  firstname?: string;
  /** Last name */
  lastname?: string;
  /** Company name */
  company?: string;
  /** Phone number */
  phone?: string;
  /** Lifecycle stage */
  lifecyclestage?: 'lead' | 'opportunity' | 'customer';
  /** Custom properties */
  properties?: Record<string, any>;
}

/**
 * Zod schema for Contact
 */
export const ContactSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  lifecyclestage: z.enum(['lead', 'opportunity', 'customer']).optional(),
  properties: z.record(z.any()).optional(),
});

/**
 * HubSpot deal
 */
export interface Deal {
  /** Deal ID (if existing) */
  id?: string;
  /** Deal name */
  dealname: string;
  /** Deal amount in USD */
  amount: number;
  /** Current deal stage */
  dealstage: string;
  /** Expected close date */
  closedate?: Date;
  /** Associated contact ID */
  contactId?: string;
}

/**
 * Zod schema for Deal
 */
export const DealSchema = z.object({
  id: z.string().optional(),
  dealname: z.string().min(1),
  amount: z.number().nonnegative(),
  dealstage: z.string().min(1),
  closedate: z.date().optional(),
  contactId: z.string().optional(),
});

/**
 * Email service configuration
 */
export interface EmailConfig {
  /** Email provider */
  provider: 'sendgrid' | 'mailgun' | 'ses';
  /** API key for the email provider */
  apiKey: string;
  /** Default from address */
  fromAddress: string;
  /** Default from name */
  fromName: string;
}

/**
 * Zod schema for EmailConfig
 */
export const EmailConfigSchema = z.object({
  provider: z.enum(['sendgrid', 'mailgun', 'ses']),
  apiKey: z.string().min(1),
  fromAddress: z.string().email(),
  fromName: z.string().min(1),
});

/**
 * Email message
 */
export interface EmailMessage {
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject */
  subject: string;
  /** HTML body */
  html: string;
  /** Plain text body */
  text?: string;
  /** Reply-to address */
  replyTo?: string;
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** Email attachments */
  attachments?: Array<{
    /** File name */
    filename: string;
    /** File content (base64 or buffer) */
    content: string | Buffer;
    /** MIME type */
    type?: string;
  }>;
}

/**
 * Zod schema for EmailMessage
 */
export const EmailMessageSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1),
        content: z.union([z.string(), z.instanceof(Buffer)]),
        type: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * Email template
 */
export interface EmailTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Subject line (can include variables) */
  subject: string;
  /** HTML template (can include variables) */
  html: string;
  /** Variable names used in the template */
  variables: string[];
}

/**
 * Zod schema for EmailTemplate
 */
export const EmailTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  html: z.string().min(1),
  variables: z.array(z.string()),
});

/**
 * Integration health status
 */
export interface IntegrationHealth {
  /** Integration name */
  name: string;
  /** Whether the integration is healthy */
  healthy: boolean;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Last successful connection */
  lastSuccess?: Date;
  /** Last error encountered */
  lastError?: {
    message: string;
    timestamp: Date;
  };
  /** Additional diagnostic details */
  details?: Record<string, any>;
}

/**
 * Zod schema for IntegrationHealth
 */
export const IntegrationHealthSchema = z.object({
  name: z.string().min(1),
  healthy: z.boolean(),
  responseTime: z.number().nonnegative().optional(),
  lastSuccess: z.date().optional(),
  lastError: z
    .object({
      message: z.string(),
      timestamp: z.date(),
    })
    .optional(),
  details: z.record(z.any()).optional(),
});

/**
 * API rate limit information
 */
export interface RateLimitInfo {
  /** Limit for this time window */
  limit: number;
  /** Remaining calls in this window */
  remaining: number;
  /** When the rate limit resets */
  resetAt: Date;
  /** Whether rate limit is currently exceeded */
  isExceeded: boolean;
}

/**
 * Zod schema for RateLimitInfo
 */
export const RateLimitInfoSchema = z.object({
  limit: z.number().positive(),
  remaining: z.number().nonnegative(),
  resetAt: z.date(),
  isExceeded: z.boolean(),
});

/**
 * Helper to validate integration configuration
 */
export function validateSupabaseConfig(data: unknown): SupabaseConfig {
  return SupabaseConfigSchema.parse(data);
}

export function validateN8nConfig(data: unknown): N8nConfig {
  return N8nConfigSchema.parse(data);
}

export function validateBufferConfig(data: unknown): BufferConfig {
  return BufferConfigSchema.parse(data);
}

export function validateHubSpotConfig(data: unknown): HubSpotConfig {
  return HubSpotConfigSchema.parse(data);
}

export function validateEmailConfig(data: unknown): EmailConfig {
  return EmailConfigSchema.parse(data);
}
