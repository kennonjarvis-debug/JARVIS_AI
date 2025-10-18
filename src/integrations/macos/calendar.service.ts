/**
 * macOS Calendar Integration Service
 *
 * Provides access to macOS Calendar for event management and reminders.
 * Requires Calendar permission.
 *
 * Features:
 * - Read calendar events
 * - Create events
 * - Update events
 * - Send meeting reminders
 * - Sync with Jarvis tasks
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface CalendarEvent {
  id?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  calendar?: string;
  allDay?: boolean;
  url?: string;
  attendees?: string[];
}

export interface EventReminder {
  title: string;
  startDate: Date;
  timeUntil: number; // minutes until event
}

export class CalendarService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Check if Calendar permission is granted
   */
  async checkPermission(): Promise<boolean> {
    try {
      const script = `
        tell application "Calendar"
          return count of calendars
        end tell
      `;

      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return true;
    } catch (error) {
      console.error('[Calendar] Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get all calendars
   */
  async getCalendars(): Promise<string[]> {
    const script = `
      tell application "Calendar"
        return name of every calendar
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return stdout.trim().split(', ');
    } catch (error) {
      console.error('[Calendar] Failed to get calendars:', error);
      return [];
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(event: CalendarEvent): Promise<boolean> {
    const calendarName = event.calendar || 'Calendar';
    const startDate = this.formatDateForAppleScript(event.startDate);
    const endDate = this.formatDateForAppleScript(event.endDate);

    const script = `
      tell application "Calendar"
        tell calendar "${calendarName}"
          set newEvent to make new event with properties {summary:"${event.title}", start date:date "${startDate}", end date:date "${endDate}"${event.location ? `, location:"${event.location}"` : ''}${event.notes ? `, description:"${event.notes.replace(/"/g, '\\"')}"` : ''}${event.allDay ? ', allday event:true' : ''}}
          return id of newEvent
        end tell
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      this.emit('event_created', { eventId: stdout.trim(), event });
      return true;
    } catch (error) {
      console.error('[Calendar] Failed to create event:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Get today's events
   */
  async getTodayEvents(): Promise<CalendarEvent[]> {
    const script = `
      tell application "Calendar"
        set todayStart to current date
        set time of todayStart to 0
        set todayEnd to todayStart + (1 * days)

        set eventList to {}
        repeat with cal in calendars
          set calEvents to (every event of cal whose start date ≥ todayStart and start date < todayEnd)
          repeat with evt in calEvents
            set eventInfo to {}
            set end of eventInfo to summary of evt
            set end of eventInfo to start date of evt as string
            set end of eventInfo to end date of evt as string
            set end of eventInfo to location of evt
            set end of eventInfo to description of evt
            set end of eventList to eventInfo as string
          end repeat
        end repeat

        return eventList
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return this.parseEventsOutput(stdout);
    } catch (error) {
      console.error('[Calendar] Failed to get today\'s events:', error);
      return [];
    }
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    const script = `
      tell application "Calendar"
        set startDate to current date
        set endDate to startDate + (${days} * days)

        set eventList to {}
        repeat with cal in calendars
          set calEvents to (every event of cal whose start date ≥ startDate and start date < endDate)
          repeat with evt in calEvents
            set eventInfo to {}
            set end of eventInfo to summary of evt
            set end of eventInfo to start date of evt as string
            set end of eventInfo to end date of evt as string
            set end of eventInfo to location of evt
            set end of eventInfo to description of evt
            set end of eventList to eventInfo as string
          end repeat
        end repeat

        return eventList
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return this.parseEventsOutput(stdout);
    } catch (error) {
      console.error('[Calendar] Failed to get upcoming events:', error);
      return [];
    }
  }

  /**
   * Get events for a specific date
   */
  async getEventsForDate(date: Date): Promise<CalendarEvent[]> {
    const dateStr = this.formatDateForAppleScript(date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = this.formatDateForAppleScript(nextDay);

    const script = `
      tell application "Calendar"
        set targetStart to date "${dateStr}"
        set targetEnd to date "${nextDayStr}"

        set eventList to {}
        repeat with cal in calendars
          set calEvents to (every event of cal whose start date ≥ targetStart and start date < targetEnd)
          repeat with evt in calEvents
            set eventInfo to {}
            set end of eventInfo to summary of evt
            set end of eventInfo to start date of evt as string
            set end of eventInfo to end date of evt as string
            set end of eventInfo to location of evt
            set end of eventList to eventInfo as string
          end repeat
        end repeat

        return eventList
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return this.parseEventsOutput(stdout);
    } catch (error) {
      console.error('[Calendar] Failed to get events for date:', error);
      return [];
    }
  }

  /**
   * Get next event
   */
  async getNextEvent(): Promise<CalendarEvent | null> {
    const script = `
      tell application "Calendar"
        set nowDate to current date

        set nextEvent to missing value
        set nextEventTime to missing value

        repeat with cal in calendars
          set calEvents to (every event of cal whose start date ≥ nowDate)
          repeat with evt in calEvents
            if nextEventTime is missing value or (start date of evt) < nextEventTime then
              set nextEvent to evt
              set nextEventTime to start date of evt
            end if
          end repeat
        end repeat

        if nextEvent is not missing value then
          set eventInfo to {}
          set end of eventInfo to summary of nextEvent
          set end of eventInfo to start date of nextEvent as string
          set end of eventInfo to end date of nextEvent as string
          set end of eventInfo to location of nextEvent
          return eventInfo as string
        else
          return ""
        end if
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      const events = this.parseEventsOutput(stdout);
      return events[0] || null;
    } catch (error) {
      console.error('[Calendar] Failed to get next event:', error);
      return null;
    }
  }

  /**
   * Get events that need reminders
   */
  async getUpcomingReminders(minutesAhead: number = 15): Promise<EventReminder[]> {
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutesAhead * 60000);

    const events = await this.getTodayEvents();
    const reminders: EventReminder[] = [];

    for (const event of events) {
      const eventStart = new Date(event.startDate);
      if (eventStart > now && eventStart <= futureTime) {
        const minutesUntil = Math.floor((eventStart.getTime() - now.getTime()) / 60000);
        reminders.push({
          title: event.title,
          startDate: eventStart,
          timeUntil: minutesUntil,
        });
      }
    }

    return reminders;
  }

  /**
   * Create event from Jarvis task
   */
  async createEventFromTask(task: {
    title: string;
    description?: string;
    dueDate?: Date;
    duration?: number; // minutes
  }): Promise<boolean> {
    const startDate = task.dueDate || new Date();
    const endDate = new Date(startDate.getTime() + (task.duration || 60) * 60000);

    return this.createEvent({
      title: `[Jarvis] ${task.title}`,
      startDate,
      endDate,
      notes: task.description,
      calendar: 'Jarvis',
    });
  }

  /**
   * Get daily briefing
   */
  async getDailyBriefing(): Promise<string> {
    const events = await this.getTodayEvents();

    if (events.length === 0) {
      return 'No events scheduled for today.';
    }

    let briefing = `You have ${events.length} event${events.length > 1 ? 's' : ''} today:\n\n`;

    for (const event of events) {
      const time = new Date(event.startDate).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      briefing += `- ${time}: ${event.title}`;
      if (event.location) {
        briefing += ` at ${event.location}`;
      }
      briefing += '\n';
    }

    return briefing;
  }

  /**
   * Parse events output from AppleScript
   */
  private parseEventsOutput(output: string): CalendarEvent[] {
    if (!output || output.trim() === '') {
      return [];
    }

    const lines = output.split('\n').filter(line => line.trim());
    const events: CalendarEvent[] = [];

    for (const line of lines) {
      const parts = line.split(', ').map(p => p.trim());

      if (parts.length >= 3) {
        events.push({
          title: parts[0] || 'Untitled',
          startDate: new Date(parts[1] || new Date()),
          endDate: new Date(parts[2] || new Date()),
          location: parts[3] || undefined,
          notes: parts[4] || undefined,
        });
      }
    }

    return events;
  }

  /**
   * Format date for AppleScript
   */
  private formatDateForAppleScript(date: Date): string {
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
  }

  /**
   * Open Calendar app
   */
  async openCalendar(): Promise<void> {
    const script = 'tell application "Calendar" to activate';
    try {
      await execAsync(`osascript -e '${script}'`);
    } catch (error) {
      console.error('[Calendar] Failed to open Calendar app:', error);
      throw error;
    }
  }
}

/**
 * Create a singleton instance
 */
export const calendarService = new CalendarService();
