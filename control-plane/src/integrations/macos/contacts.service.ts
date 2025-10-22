/**
 * macOS Contacts Integration Service
 *
 * Provides access to macOS Contacts app for personalized interactions.
 * Requires Contacts permission.
 *
 * Features:
 * - Read contacts from macOS Contacts
 * - Search contacts by name, email, phone
 * - Get contact details
 * - Integrate with message personalization
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  emails: string[];
  phones: string[];
  company?: string;
  jobTitle?: string;
  notes?: string;
  birthday?: Date;
}

export class ContactsService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Check if Contacts permission is granted
   */
  async checkPermission(): Promise<boolean> {
    try {
      const script = `
        tell application "Contacts"
          return count of people
        end tell
      `;

      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return true;
    } catch (error) {
      console.error('[Contacts] Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get all contacts
   */
  async getAllContacts(limit: number = 1000): Promise<Contact[]> {
    const script = `
      tell application "Contacts"
        set contactList to {}
        set peopleList to people
        set maxCount to ${limit}
        set counter to 0

        repeat with p in peopleList
          if counter < maxCount then
            set contactInfo to {}
            set end of contactInfo to id of p
            set end of contactInfo to first name of p
            set end of contactInfo to last name of p

            -- Get emails
            set emailList to {}
            repeat with e in emails of p
              set end of emailList to value of e
            end repeat
            set end of contactInfo to emailList as string

            -- Get phones
            set phoneList to {}
            repeat with ph in phones of p
              set end of phoneList to value of ph
            end repeat
            set end of contactInfo to phoneList as string

            set end of contactInfo to company of p
            set end of contactInfo to job title of p

            set end of contactList to contactInfo as string
            set counter to counter + 1
          end if
        end repeat

        return contactList
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return this.parseContactsOutput(stdout);
    } catch (error) {
      console.error('[Contacts] Failed to get contacts:', error);
      return [];
    }
  }

  /**
   * Search contacts by name
   */
  async searchByName(query: string): Promise<Contact[]> {
    const script = `
      tell application "Contacts"
        set matchingPeople to people whose name contains "${query}"
        set resultList to {}

        repeat with p in matchingPeople
          set contactInfo to {}
          set end of contactInfo to id of p
          set end of contactInfo to first name of p
          set end of contactInfo to last name of p
          set end of contactInfo to name of p

          -- Get first email
          if (count of emails of p) > 0 then
            set end of contactInfo to value of first email of p
          else
            set end of contactInfo to ""
          end if

          -- Get first phone
          if (count of phones of p) > 0 then
            set end of contactInfo to value of first phone of p
          else
            set end of contactInfo to ""
          end if

          set end of resultList to contactInfo as string
        end repeat

        return resultList
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return this.parseSearchOutput(stdout);
    } catch (error) {
      console.error('[Contacts] Search failed:', error);
      return [];
    }
  }

  /**
   * Search contacts by email
   */
  async searchByEmail(email: string): Promise<Contact | null> {
    const script = `
      tell application "Contacts"
        set matchingPeople to people whose emails's value contains "${email}"
        if (count of matchingPeople) > 0 then
          set p to first item of matchingPeople
          set contactInfo to {}
          set end of contactInfo to id of p
          set end of contactInfo to first name of p
          set end of contactInfo to last name of p
          set end of contactInfo to name of p
          return contactInfo as string
        else
          return ""
        end if
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      const contacts = this.parseSearchOutput(stdout);
      return contacts[0] || null;
    } catch (error) {
      console.error('[Contacts] Email search failed:', error);
      return null;
    }
  }

  /**
   * Search contacts by phone number
   */
  async searchByPhone(phone: string): Promise<Contact | null> {
    // Normalize phone number (remove spaces, dashes, parentheses)
    const normalizedPhone = phone.replace(/[\s\-()]/g, '');

    const script = `
      tell application "Contacts"
        set matchingPeople to people whose phones's value contains "${normalizedPhone}"
        if (count of matchingPeople) > 0 then
          set p to first item of matchingPeople
          set contactInfo to {}
          set end of contactInfo to id of p
          set end of contactInfo to first name of p
          set end of contactInfo to last name of p
          set end of contactInfo to name of p
          return contactInfo as string
        else
          return ""
        end if
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      const contacts = this.parseSearchOutput(stdout);
      return contacts[0] || null;
    } catch (error) {
      console.error('[Contacts] Phone search failed:', error);
      return null;
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(id: string): Promise<Contact | null> {
    const script = `
      tell application "Contacts"
        set p to person id "${id}"
        set contactInfo to {}
        set end of contactInfo to id of p
        set end of contactInfo to first name of p
        set end of contactInfo to last name of p
        set end of contactInfo to name of p

        -- Get all emails
        set emailList to {}
        repeat with e in emails of p
          set end of emailList to value of e
        end repeat
        set end of contactInfo to emailList as string

        -- Get all phones
        set phoneList to {}
        repeat with ph in phones of p
          set end of phoneList to value of ph
        end repeat
        set end of contactInfo to phoneList as string

        set end of contactInfo to company of p
        set end of contactInfo to job title of p

        return contactInfo as string
      end tell
    `;

    try {
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      const contacts = this.parseSearchOutput(stdout);
      return contacts[0] || null;
    } catch (error) {
      console.error('[Contacts] Get contact failed:', error);
      return null;
    }
  }

  /**
   * Get contact's full name by identifier (email or phone)
   */
  async getNameByIdentifier(identifier: string): Promise<string | null> {
    // Try email first
    if (identifier.includes('@')) {
      const contact = await this.searchByEmail(identifier);
      return contact?.fullName || null;
    }

    // Try phone
    const contact = await this.searchByPhone(identifier);
    return contact?.fullName || null;
  }

  /**
   * Parse contacts output
   */
  private parseContactsOutput(output: string): Contact[] {
    if (!output || output.trim() === '') {
      return [];
    }

    // AppleScript output parsing is complex, return empty for now
    // In production, this would parse the structured output
    return [];
  }

  /**
   * Parse search output
   */
  private parseSearchOutput(output: string): Contact[] {
    if (!output || output.trim() === '') {
      return [];
    }

    const lines = output.split('\n').filter(line => line.trim());
    const contacts: Contact[] = [];

    for (const line of lines) {
      // Parse the comma-separated values from AppleScript
      const parts = line.split(', ').map(p => p.trim());

      if (parts.length >= 4) {
        contacts.push({
          id: parts[0] || '',
          firstName: parts[1] || '',
          lastName: parts[2] || '',
          fullName: parts[3] || '',
          emails: parts[4] ? parts[4].split(',').map(e => e.trim()) : [],
          phones: parts[5] ? parts[5].split(',').map(p => p.trim()) : [],
          company: parts[6] || undefined,
          jobTitle: parts[7] || undefined,
        });
      }
    }

    return contacts;
  }

  /**
   * Get contact suggestions for autocomplete
   */
  async getSuggestions(query: string, limit: number = 5): Promise<Contact[]> {
    const results = await this.searchByName(query);
    return results.slice(0, limit);
  }

  /**
   * Check if a person is in contacts
   */
  async isInContacts(identifier: string): Promise<boolean> {
    if (identifier.includes('@')) {
      const contact = await this.searchByEmail(identifier);
      return contact !== null;
    } else {
      const contact = await this.searchByPhone(identifier);
      return contact !== null;
    }
  }

  /**
   * Get personalization data for messaging
   */
  async getPersonalizationData(identifier: string): Promise<{
    name: string;
    firstName: string;
    relationship: 'contact' | 'unknown';
  }> {
    const contact = identifier.includes('@')
      ? await this.searchByEmail(identifier)
      : await this.searchByPhone(identifier);

    if (contact) {
      return {
        name: contact.fullName,
        firstName: contact.firstName,
        relationship: 'contact',
      };
    }

    return {
      name: identifier,
      firstName: 'there',
      relationship: 'unknown',
    };
  }
}

/**
 * Create a singleton instance
 */
export const contactsService = new ContactsService();
