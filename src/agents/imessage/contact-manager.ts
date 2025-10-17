/**
 * Contact Manager
 * Manages contact information, whitelist, and settings
 */

import * as fs from 'fs';
import * as path from 'path';
import { Contact } from './types.js';
import { logger } from '../../utils/logger.js';

export class ContactManager {
  private contacts: Map<string, Contact> = new Map();
  private contactsFilePath: string;

  constructor(dataDirectory: string = '/tmp/jarvis-imessage') {
    // Ensure data directory exists
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }

    this.contactsFilePath = path.join(dataDirectory, 'contacts.json');
    this.loadContacts();
  }

  /**
   * Get a contact by handle
   */
  getContact(handle: string): Contact | undefined {
    return this.contacts.get(handle);
  }

  /**
   * Get all contacts
   */
  getAllContacts(): Contact[] {
    return Array.from(this.contacts.values());
  }

  /**
   * Get whitelisted contacts (auto-response enabled)
   */
  getWhitelistedContacts(): Contact[] {
    return this.getAllContacts().filter(c => c.autoResponseEnabled);
  }

  /**
   * Add or update a contact
   */
  updateContact(contact: Contact): void {
    this.contacts.set(contact.handle, contact);
    this.saveContacts();

    logger.info('Contact updated', {
      handle: contact.handle,
      relationshipType: contact.relationshipType,
      autoResponseEnabled: contact.autoResponseEnabled,
    });
  }

  /**
   * Add a contact to whitelist
   */
  addToWhitelist(handle: string, relationshipType: Contact['relationshipType'] = 'unknown'): void {
    const existing = this.contacts.get(handle);

    if (existing) {
      existing.autoResponseEnabled = true;
      this.contacts.set(handle, existing);
    } else {
      this.contacts.set(handle, {
        handle,
        relationshipType,
        autoResponseEnabled: true,
        responseCount: 0,
      });
    }

    this.saveContacts();
    logger.info('Contact added to whitelist', { handle, relationshipType });
  }

  /**
   * Remove a contact from whitelist
   */
  removeFromWhitelist(handle: string): void {
    const contact = this.contacts.get(handle);
    if (contact) {
      contact.autoResponseEnabled = false;
      this.contacts.set(handle, contact);
      this.saveContacts();
      logger.info('Contact removed from whitelist', { handle });
    }
  }

  /**
   * Check if a contact is whitelisted
   */
  isWhitelisted(handle: string): boolean {
    const contact = this.contacts.get(handle);
    return contact?.autoResponseEnabled || false;
  }

  /**
   * Set custom AI prompt for a contact
   */
  setCustomPrompt(handle: string, prompt: string): void {
    const contact = this.contacts.get(handle);
    if (contact) {
      contact.customPrompt = prompt;
      this.contacts.set(handle, contact);
      this.saveContacts();
      logger.info('Custom prompt set for contact', { handle });
    }
  }

  /**
   * Update contact relationship type
   */
  setRelationshipType(handle: string, relationshipType: Contact['relationshipType']): void {
    const contact = this.contacts.get(handle);
    if (contact) {
      contact.relationshipType = relationshipType;
      this.contacts.set(handle, contact);
      this.saveContacts();
      logger.info('Relationship type updated', { handle, relationshipType });
    }
  }

  /**
   * Increment response count for a contact
   */
  incrementResponseCount(handle: string): void {
    const contact = this.contacts.get(handle);
    if (contact) {
      contact.responseCount++;
      contact.lastResponseTime = new Date();
      this.contacts.set(handle, contact);
      this.saveContacts();
    }
  }

  /**
   * Delete a contact
   */
  deleteContact(handle: string): void {
    this.contacts.delete(handle);
    this.saveContacts();
    logger.info('Contact deleted', { handle });
  }

  /**
   * Import contacts from array
   */
  importContacts(contacts: Contact[]): void {
    for (const contact of contacts) {
      this.contacts.set(contact.handle, contact);
    }
    this.saveContacts();
    logger.info('Contacts imported', { count: contacts.length });
  }

  /**
   * Load contacts from disk
   */
  private loadContacts(): void {
    try {
      if (fs.existsSync(this.contactsFilePath)) {
        const data = fs.readFileSync(this.contactsFilePath, 'utf-8');
        const parsed = JSON.parse(data);

        for (const [handle, contact] of Object.entries(parsed)) {
          const typedContact = contact as any;
          this.contacts.set(handle, {
            ...typedContact,
            lastResponseTime: typedContact.lastResponseTime
              ? new Date(typedContact.lastResponseTime)
              : undefined,
          });
        }

        logger.info('Contacts loaded', {
          count: this.contacts.size,
        });
      } else {
        // Initialize with empty contacts file
        this.saveContacts();
      }
    } catch (error) {
      logger.error('Failed to load contacts', { error });
    }
  }

  /**
   * Save contacts to disk
   */
  private saveContacts(): void {
    try {
      const data = Object.fromEntries(this.contacts.entries());
      fs.writeFileSync(this.contactsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to save contacts', { error });
    }
  }

  /**
   * Get whitelist as array of handles
   */
  getWhitelist(): string[] {
    return this.getWhitelistedContacts().map(c => c.handle);
  }

  /**
   * Bulk add to whitelist
   */
  bulkAddToWhitelist(handles: string[], relationshipType: Contact['relationshipType'] = 'unknown'): void {
    for (const handle of handles) {
      this.addToWhitelist(handle, relationshipType);
    }
  }
}
