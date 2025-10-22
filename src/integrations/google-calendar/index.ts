import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string; // ISO 8601 format
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export class GoogleCalendarIntegration {
  private logger: Logger;
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar | null = null;
  private tokenPath: string;

  constructor() {
    this.logger = new Logger('GoogleCalendarIntegration');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';

    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    this.tokenPath = path.join(os.homedir(), '.jarvis', 'gmail-token.json'); // Reuse Gmail token
  }

  /**
   * Initialize the Google Calendar integration
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Google Calendar integration');

    // Check if we have saved credentials
    if (fs.existsSync(this.tokenPath)) {
      const tokenData = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
      this.oauth2Client.setCredentials(tokenData);
      this.logger.info('Loaded saved Google credentials');
    } else {
      this.logger.warn('No saved Google credentials found. Need to authorize.');
      throw new Error('Not authorized - run `npm run gmail:auth` first');
    }

    // Create calendar client
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.logger.info('Google Calendar client initialized');
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    event: GoogleCalendarEvent,
    calendarId: string = 'primary'
  ): Promise<string> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    try {
      this.logger.info('Creating Google Calendar event', {
        summary: event.summary,
        start: event.start.dateTime,
        calendarId,
      });

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        sendUpdates: 'none', // Don't send email notifications
      });

      const eventId = response.data.id || 'unknown';
      const eventLink = response.data.htmlLink;

      this.logger.info('Google Calendar event created', {
        eventId,
        eventLink,
      });

      return eventId;
    } catch (error) {
      this.logger.error('Failed to create Google Calendar event', error as Error);
      throw error;
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(
    maxResults: number = 10,
    calendarId: string = 'primary'
  ): Promise<calendar_v3.Schema$Event[]> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    try {
      const now = new Date().toISOString();

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: now,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      this.logger.error('Failed to get upcoming events', error as Error);
      throw error;
    }
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<GoogleCalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<void> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    try {
      await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: updates,
      });

      this.logger.info('Google Calendar event updated', { eventId });
    } catch (error) {
      this.logger.error('Failed to update event', error as Error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });

      this.logger.info('Google Calendar event deleted', { eventId });
    } catch (error) {
      this.logger.error('Failed to delete event', error as Error);
      throw error;
    }
  }

  /**
   * List all calendars
   */
  async listCalendars(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      this.logger.error('Failed to list calendars', error as Error);
      throw error;
    }
  }

  /**
   * Convert CalendarEvent from macOS integration to Google format
   */
  convertToGoogleEvent(event: {
    title: string;
    startDate: Date;
    endDate: Date;
    location?: string;
    notes?: string;
    attendees?: string[];
  }): GoogleCalendarEvent {
    return {
      summary: event.title,
      description: event.notes,
      location: event.location,
      start: {
        dateTime: event.startDate.toISOString(),
        timeZone: 'America/Phoenix', // Arizona timezone
      },
      end: {
        dateTime: event.endDate.toISOString(),
        timeZone: 'America/Phoenix',
      },
      attendees: event.attendees?.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 1440 }, // 24 hours before
        ],
      },
    };
  }
}
