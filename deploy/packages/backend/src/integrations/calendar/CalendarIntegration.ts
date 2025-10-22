/**
 * Google Calendar Integration
 * Handles calendar event management via Google Calendar API
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuthConnector, type IntegrationConfig } from '../base/OAuthConnector.js';

export interface CalendarConfig extends IntegrationConfig {
  oauthConfig: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  attendees?: { email: string; responseStatus?: string }[];
  status: string;
  htmlLink: string;
  created: Date;
  updated: Date;
}

export interface CreateEventParams {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  attendees?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: { method: string; minutes: number }[];
  };
  colorId?: string;
}

/**
 * Google Calendar Integration using OAuth 2.0
 */
export class CalendarIntegration extends OAuthConnector {
  private calendarClient?: calendar_v3.Calendar;

  constructor(config: CalendarConfig) {
    const oauthConfig = {
      clientId: config.oauthConfig.clientId || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: config.oauthConfig.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: config.oauthConfig.redirectUri || `${process.env.APP_URL}/api/integrations/calendar/callback`,
      scopes: config.oauthConfig.scopes || [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
    };

    super({ ...config, oauthConfig });
  }

  get name(): string {
    return 'calendar';
  }

  get displayName(): string {
    return 'Google Calendar';
  }

  /**
   * Initialize Calendar client
   */
  async initialize(): Promise<void> {
    await super.initialize();

    // Initialize Calendar API client
    this.calendarClient = google.calendar({
      version: 'v3',
      auth: this.oauth2Client,
    });

    this.logger.info('Calendar client initialized');
  }

  /**
   * Test platform connection by fetching calendar list
   */
  protected async testPlatformConnection(): Promise<boolean> {
    try {
      if (!this.calendarClient) {
        return false;
      }

      await this.ensureValidToken();
      const response = await this.calendarClient.calendarList.list({ maxResults: 1 });
      this.logger.info('Calendar connection test successful', { calendars: response.data.items?.length || 0 });
      return true;
    } catch (error) {
      this.logger.error('Calendar connection test failed', error);
      return false;
    }
  }

  /**
   * List all calendars
   */
  async listCalendars(): Promise<{ id: string; summary: string; primary?: boolean; description?: string }[]> {
    if (!this.calendarClient) {
      throw new Error('Calendar client not initialized');
    }

    await this.ensureValidToken();
    const response = await this.calendarClient.calendarList.list();

    return (response.data.items || []).map(calendar => ({
      id: calendar.id || '',
      summary: calendar.summary || '',
      primary: calendar.primary,
      description: calendar.description,
    }));
  }

  /**
   * List events from a calendar
   */
  async listEvents(params?: {
    calendarId?: string;
    maxResults?: number;
    timeMin?: Date;
    timeMax?: Date;
    showDeleted?: boolean;
    singleEvents?: boolean;
    orderBy?: string;
  }): Promise<CalendarEvent[]> {
    if (!this.calendarClient) {
      throw new Error('Calendar client not initialized');
    }

    await this.ensureValidToken();

    const calendarId = params?.calendarId || 'primary';

    const response = await this.calendarClient.events.list({
      calendarId,
      maxResults: params?.maxResults || 10,
      timeMin: params?.timeMin?.toISOString(),
      timeMax: params?.timeMax?.toISOString(),
      showDeleted: params?.showDeleted || false,
      singleEvents: params?.singleEvents !== false,
      orderBy: params?.orderBy || 'startTime',
    });

    const events: CalendarEvent[] = (response.data.items || []).map(event => ({
      id: event.id || '',
      summary: event.summary || '',
      description: event.description,
      location: event.location,
      start: new Date(event.start?.dateTime || event.start?.date || ''),
      end: new Date(event.end?.dateTime || event.end?.date || ''),
      attendees: event.attendees?.map(a => ({ email: a.email || '', responseStatus: a.responseStatus })),
      status: event.status || 'confirmed',
      htmlLink: event.htmlLink || '',
      created: new Date(event.created || ''),
      updated: new Date(event.updated || ''),
    }));

    await this.logActivity({
      activityType: 'calendar',
      action: 'list_events',
      title: 'Listed calendar events',
      metadata: { calendarId, count: events.length },
    });

    return events;
  }

  /**
   * Get a specific event
   */
  async getEvent(eventId: string, calendarId: string = 'primary'): Promise<CalendarEvent> {
    if (!this.calendarClient) {
      throw new Error('Calendar client not initialized');
    }

    await this.ensureValidToken();

    const response = await this.calendarClient.events.get({
      calendarId,
      eventId,
    });

    const event = response.data;

    return {
      id: event.id || '',
      summary: event.summary || '',
      description: event.description,
      location: event.location,
      start: new Date(event.start?.dateTime || event.start?.date || ''),
      end: new Date(event.end?.dateTime || event.end?.date || ''),
      attendees: event.attendees?.map(a => ({ email: a.email || '', responseStatus: a.responseStatus })),
      status: event.status || 'confirmed',
      htmlLink: event.htmlLink || '',
      created: new Date(event.created || ''),
      updated: new Date(event.updated || ''),
    };
  }

  /**
   * Create a new event
   */
  async createEvent(params: CreateEventParams, calendarId: string = 'primary'): Promise<CalendarEvent> {
    if (!this.calendarClient) {
      throw new Error('Calendar client not initialized');
    }

    await this.ensureValidToken();

    const event = {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: {
        dateTime: params.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: params.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: params.attendees?.map(email => ({ email })),
      reminders: params.reminders || {
        useDefault: true,
      },
      colorId: params.colorId,
    };

    const response = await this.calendarClient.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: 'all', // Send email notifications to attendees
    });

    await this.logActivity({
      activityType: 'calendar',
      action: 'create_event',
      title: `Created event: ${params.summary}`,
      metadata: { eventId: response.data.id, calendarId },
    });

    const createdEvent = response.data;

    return {
      id: createdEvent.id || '',
      summary: createdEvent.summary || '',
      description: createdEvent.description,
      location: createdEvent.location,
      start: new Date(createdEvent.start?.dateTime || createdEvent.start?.date || ''),
      end: new Date(createdEvent.end?.dateTime || createdEvent.end?.date || ''),
      attendees: createdEvent.attendees?.map(a => ({ email: a.email || '', responseStatus: a.responseStatus })),
      status: createdEvent.status || 'confirmed',
      htmlLink: createdEvent.htmlLink || '',
      created: new Date(createdEvent.created || ''),
      updated: new Date(createdEvent.updated || ''),
    };
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: Partial<CreateEventParams>, calendarId: string = 'primary'): Promise<CalendarEvent> {
    if (!this.calendarClient) {
      throw new Error('Calendar client not initialized');
    }

    await this.ensureValidToken();

    const event: any = {};

    if (updates.summary) event.summary = updates.summary;
    if (updates.description !== undefined) event.description = updates.description;
    if (updates.location !== undefined) event.location = updates.location;
    if (updates.start) {
      event.start = {
        dateTime: updates.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    if (updates.end) {
      event.end = {
        dateTime: updates.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    if (updates.attendees) event.attendees = updates.attendees.map(email => ({ email }));
    if (updates.reminders) event.reminders = updates.reminders;
    if (updates.colorId) event.colorId = updates.colorId;

    const response = await this.calendarClient.events.patch({
      calendarId,
      eventId,
      requestBody: event,
      sendUpdates: 'all',
    });

    await this.logActivity({
      activityType: 'calendar',
      action: 'update_event',
      title: `Updated event: ${updates.summary || eventId}`,
      metadata: { eventId, calendarId },
    });

    const updatedEvent = response.data;

    return {
      id: updatedEvent.id || '',
      summary: updatedEvent.summary || '',
      description: updatedEvent.description,
      location: updatedEvent.location,
      start: new Date(updatedEvent.start?.dateTime || updatedEvent.start?.date || ''),
      end: new Date(updatedEvent.end?.dateTime || updatedEvent.end?.date || ''),
      attendees: updatedEvent.attendees?.map(a => ({ email: a.email || '', responseStatus: a.responseStatus })),
      status: updatedEvent.status || 'confirmed',
      htmlLink: updatedEvent.htmlLink || '',
      created: new Date(updatedEvent.created || ''),
      updated: new Date(updatedEvent.updated || ''),
    };
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    if (!this.calendarClient) {
      throw new Error('Calendar client not initialized');
    }

    await this.ensureValidToken();

    await this.calendarClient.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all',
    });

    await this.logActivity({
      activityType: 'calendar',
      action: 'delete_event',
      title: 'Deleted calendar event',
      metadata: { eventId, calendarId },
    });
  }

  /**
   * Get upcoming events (next N events)
   */
  async getUpcomingEvents(maxResults: number = 10, calendarId: string = 'primary'): Promise<CalendarEvent[]> {
    return this.listEvents({
      calendarId,
      maxResults,
      timeMin: new Date(),
      singleEvents: true,
      orderBy: 'startTime',
    });
  }

  /**
   * Get events for today
   */
  async getTodayEvents(calendarId: string = 'primary'): Promise<CalendarEvent[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    return this.listEvents({
      calendarId,
      timeMin: startOfDay,
      timeMax: endOfDay,
      singleEvents: true,
      orderBy: 'startTime',
    });
  }

  /**
   * Search events
   */
  async searchEvents(query: string, calendarId: string = 'primary', maxResults: number = 10): Promise<CalendarEvent[]> {
    if (!this.calendarClient) {
      throw new Error('Calendar client not initialized');
    }

    await this.ensureValidToken();

    const response = await this.calendarClient.events.list({
      calendarId,
      q: query,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (response.data.items || []).map(event => ({
      id: event.id || '',
      summary: event.summary || '',
      description: event.description,
      location: event.location,
      start: new Date(event.start?.dateTime || event.start?.date || ''),
      end: new Date(event.end?.dateTime || event.end?.date || ''),
      attendees: event.attendees?.map(a => ({ email: a.email || '', responseStatus: a.responseStatus })),
      status: event.status || 'confirmed',
      htmlLink: event.htmlLink || '',
      created: new Date(event.created || ''),
      updated: new Date(event.updated || ''),
    }));
  }
}
