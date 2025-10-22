/**
 * Zendesk Integration Client
 *
 * Handles connection to Zendesk Support API
 */

import { IExternalIntegration } from '../types.js';
import { logger } from '../../utils/structured-logger.js';

export class ZendeskClient implements IExternalIntegration {
  name = 'zendesk';
  private subdomain: string;
  private email: string;
  private apiToken: string;
  private connected: boolean = false;
  private client: any;

  constructor(subdomain: string, email: string, apiToken: string) {
    this.subdomain = subdomain;
    this.email = email;
    this.apiToken = apiToken;
  }

  async connect(): Promise<boolean> {
    try {
      // Dynamically import Zendesk client
      const zendesk = await import('node-zendesk');

      this.client = zendesk.createClient({
        username: this.email,
        token: this.apiToken,
        remoteUri: `https://${this.subdomain}.zendesk.com/api/v2`
      });

      // Test connection by getting current user
      await new Promise((resolve, reject) => {
        this.client.users.me((err: any, req: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      this.connected = true;
      logger.info('Zendesk client connected', {
        integration: 'zendesk',
        subdomain: this.subdomain
      });

      return true;
    } catch (error) {
      logger.error('Failed to connect to Zendesk', {
        integration: 'zendesk',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async test(): Promise<{ healthy: boolean; message: string }> {
    if (!this.connected || !this.client) {
      return { healthy: false, message: 'Not connected' };
    }

    try {
      await new Promise((resolve, reject) => {
        this.client.users.me((err: any, req: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      return { healthy: true, message: 'Connection successful' };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.client = null;
    logger.info('Zendesk client disconnected');
  }

  /**
   * Get tickets from Zendesk
   */
  async getTickets(options?: { status?: string }): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('Zendesk client not connected');
    }

    try {
      const tickets = await new Promise<any[]>((resolve, reject) => {
        this.client.tickets.list((err: any, req: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (options?.status) {
        return tickets.filter((t: any) => t.status === options.status);
      }

      return tickets;
    } catch (error) {
      logger.error('Failed to get Zendesk tickets', {
        integration: 'zendesk',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Zendesk client not connected');
    }

    try {
      const ticket = await new Promise((resolve, reject) => {
        this.client.tickets.show(parseInt(ticketId), (err: any, req: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      return ticket;
    } catch (error) {
      logger.error('Failed to get Zendesk ticket', {
        integration: 'zendesk',
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create ticket in Zendesk
   */
  async createTicket(ticketData: {
    subject: string;
    description: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    status?: 'new' | 'open' | 'pending' | 'solved';
    requester?: {
      name: string;
      email: string;
    };
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Zendesk client not connected');
    }

    try {
      const ticket = await new Promise((resolve, reject) => {
        this.client.tickets.create(
          {
            ticket: {
              subject: ticketData.subject,
              comment: { body: ticketData.description },
              priority: ticketData.priority || 'normal',
              status: ticketData.status || 'new',
              requester: ticketData.requester
            }
          },
          (err: any, req: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });

      logger.info('Zendesk ticket created', {
        integration: 'zendesk',
        ticketId: (ticket as any).id
      });

      return ticket;
    } catch (error) {
      logger.error('Failed to create Zendesk ticket', {
        integration: 'zendesk',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update ticket in Zendesk
   */
  async updateTicket(ticketId: string, updates: {
    status?: string;
    priority?: string;
    assignee_id?: number;
  }): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Zendesk client not connected');
    }

    try {
      const ticket = await new Promise((resolve, reject) => {
        this.client.tickets.update(
          parseInt(ticketId),
          { ticket: updates },
          (err: any, req: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });

      logger.info('Zendesk ticket updated', {
        integration: 'zendesk',
        ticketId
      });

      return ticket;
    } catch (error) {
      logger.error('Failed to update Zendesk ticket', {
        integration: 'zendesk',
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Add comment to ticket
   */
  async addComment(ticketId: string, comment: string, isPublic: boolean = true): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('Zendesk client not connected');
    }

    try {
      await new Promise((resolve, reject) => {
        this.client.tickets.update(
          parseInt(ticketId),
          {
            ticket: {
              comment: {
                body: comment,
                public: isPublic
              }
            }
          },
          (err: any, req: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });

      logger.info('Comment added to Zendesk ticket', {
        integration: 'zendesk',
        ticketId
      });
    } catch (error) {
      logger.error('Failed to add comment to Zendesk ticket', {
        integration: 'zendesk',
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
