import { execSync } from 'child_process';
import { Logger } from '../../utils/logger';

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  attendees?: string[];
}

export interface SchedulingInfo {
  hasScheduling: boolean;
  eventType?: 'date' | 'interview' | 'meeting' | 'appointment' | 'call' | 'other';
  suggestedEvent?: CalendarEvent;
  confidence: number;
}

export class CalendarIntegration {
  private logger: Logger;
  private userPhone: string;

  constructor(userPhoneNumber: string) {
    this.logger = new Logger('CalendarIntegration');
    this.userPhone = userPhoneNumber;
  }

  /**
   * Detect if a message contains scheduling information
   */
  public detectScheduling(text: string, senderHandle: string): SchedulingInfo {
    const lowerText = text.toLowerCase();

    // Scheduling keywords
    const schedulingPatterns = [
      /\b(dinner|lunch|breakfast|coffee|drinks)\b.*\b(tonight|tomorrow|this\s+week|next\s+week|on\s+\w+day)\b/i,
      /\b(meet|meeting|interview|appointment|call)\b.*\b(at|@)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
      /\b(schedule|calendar|available|free)\b.*\b(on|at|for)\b/i,
      /\b(see\s+you|meet\s+up)\b.*\b(at|on|tomorrow|tonight)\b/i,
      /\b(date|hang\s*out)\b.*\b(tonight|tomorrow|this\s+weekend)\b/i,
      /\b(interview)\b.*\b(scheduled|at|on)\b/i,
    ];

    const hasScheduling = schedulingPatterns.some(pattern => pattern.test(lowerText));

    if (!hasScheduling) {
      return { hasScheduling: false, confidence: 0 };
    }

    // Determine event type
    let eventType: SchedulingInfo['eventType'] = 'other';
    if (/\b(dinner|lunch|breakfast|coffee|drinks|date|romantic)\b/i.test(lowerText)) {
      eventType = 'date';
    } else if (/\b(interview|job)\b/i.test(lowerText)) {
      eventType = 'interview';
    } else if (/\b(meeting|call|zoom|teams)\b/i.test(lowerText)) {
      eventType = 'meeting';
    } else if (/\b(appointment|doctor|dentist)\b/i.test(lowerText)) {
      eventType = 'appointment';
    }

    // Try to extract date/time information
    const suggestedEvent = this.extractEventDetails(text, senderHandle, eventType);

    return {
      hasScheduling: true,
      eventType,
      suggestedEvent,
      confidence: suggestedEvent ? 0.8 : 0.5,
    };
  }

  /**
   * Extract event details from message
   */
  private extractEventDetails(text: string, senderHandle: string, eventType: string): CalendarEvent | undefined {
    // Try to parse dates and times from the text
    const now = new Date();
    let startDate = new Date();
    let title = `${eventType} with ${senderHandle}`;

    // Simple time extraction (e.g., "7pm", "7:30pm", "19:00")
    const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      startDate.setHours(hours, minutes, 0, 0);
    }

    // Simple day extraction
    if (/\btomorrow\b/i.test(text)) {
      startDate.setDate(now.getDate() + 1);
    } else if (/\btonight\b/i.test(text)) {
      // Keep today's date
    } else if (/\bnext\s+week\b/i.test(text)) {
      startDate.setDate(now.getDate() + 7);
    }

    // Default duration: 1-2 hours depending on event type
    const endDate = new Date(startDate);
    if (eventType === 'date' || eventType === 'meeting') {
      endDate.setHours(startDate.getHours() + 2);
    } else {
      endDate.setHours(startDate.getHours() + 1);
    }

    // Extract location if mentioned
    const locationMatch = text.match(/\bat\s+([A-Z][a-zA-Z\s]+)/);
    const location = locationMatch ? locationMatch[1].trim() : undefined;

    return {
      title,
      startDate,
      endDate,
      location,
      notes: `Original message: "${text.substring(0, 200)}"`,
      attendees: [senderHandle],
    };
  }

  /**
   * Create a calendar event on macOS Calendar
   */
  public async createCalendarEvent(event: CalendarEvent): Promise<string> {
    this.logger.info('Creating calendar event', {
      title: event.title,
      date: event.startDate.toISOString(),
    });

    try {
      // Format dates for AppleScript
      const startDateStr = this.formatDateForAppleScript(event.startDate);
      const endDateStr = this.formatDateForAppleScript(event.endDate);

      // Escape strings for AppleScript
      const escapedTitle = event.title.replace(/"/g, '\\"');
      const escapedNotes = event.notes?.replace(/"/g, '\\"') || '';
      const escapedLocation = event.location?.replace(/"/g, '\\"') || '';

      // AppleScript to create calendar event
      const script = `
tell application "Calendar"
  tell calendar "Calendar"
    set newEvent to make new event with properties {summary:"${escapedTitle}", start date:date "${startDateStr}", end date:date "${endDateStr}", location:"${escapedLocation}", description:"${escapedNotes}"}
  end tell
  return id of newEvent
end tell
      `.trim();

      const eventId = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
        encoding: 'utf-8',
      }).trim();

      this.logger.info('Calendar event created', { eventId });
      return eventId;
    } catch (error) {
      this.logger.error('Failed to create calendar event', error as Error);
      throw error;
    }
  }

  /**
   * Send notification to user's phone
   */
  public async notifyUser(message: string): Promise<void> {
    this.logger.info('Sending notification to user', {
      to: this.userPhone,
      messageLength: message.length,
    });

    try {
      // Send iMessage to user's phone number
      const escapedMessage = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escapedPhone = this.userPhone.replace(/"/g, '\\"');

      const script = `tell application "Messages"
  set targetService to 1st account whose service type = iMessage
  set targetBuddy to participant "${escapedPhone}" of targetService
  send "${escapedMessage}" to targetBuddy
end tell`;

      execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
        encoding: 'utf-8',
      });

      this.logger.info('Notification sent successfully');
    } catch (error) {
      this.logger.error('Failed to send notification', error as Error);
      throw error;
    }
  }

  /**
   * Format date for AppleScript (MM/DD/YYYY HH:MM:SS AM/PM)
   */
  private formatDateForAppleScript(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;

    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
  }

  /**
   * Handle scheduling detected in a message
   */
  public async handleScheduling(
    schedulingInfo: SchedulingInfo,
    senderHandle: string,
    messageText: string
  ): Promise<void> {
    if (!schedulingInfo.hasScheduling || !schedulingInfo.suggestedEvent) {
      return;
    }

    try {
      // Create calendar event
      const eventId = await this.createCalendarEvent(schedulingInfo.suggestedEvent);

      // Send notification to user
      const eventType = schedulingInfo.eventType || 'event';
      const dateStr = schedulingInfo.suggestedEvent.startDate.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      const notification = `📅 Calendar Event Created\n\nType: ${eventType}\nWith: ${senderHandle}\nWhen: ${dateStr}\n\nEvent ID: ${eventId}\n\nMessage: "${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}"`;

      await this.notifyUser(notification);

      this.logger.info('Scheduling handled successfully', {
        eventType,
        eventId,
        sender: senderHandle,
      });
    } catch (error) {
      this.logger.error('Failed to handle scheduling', error as Error);
      // Send error notification to user
      await this.notifyUser(
        `⚠️ Failed to create calendar event for ${schedulingInfo.eventType} with ${senderHandle}. Please create manually.`
      ).catch(() => {
        // Ignore notification errors
      });
    }
  }
}
