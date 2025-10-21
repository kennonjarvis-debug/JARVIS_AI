/**
 * Week 2: PRs #3 & #4 Type Definitions
 * Business Onboarding, Multi-Business Support, and Integration Connections
 */

// =============================================================================
// PR #3: Business Onboarding & Multi-Business Support
// =============================================================================

export interface OnboardingData {
  businessName: string;
  industry: string;
  description?: string;
  products?: string;
  targetAudience?: string;
  website?: string;
  brandVoice: 'professional' | 'casual' | 'technical' | 'creative' | 'custom';
  customBrandVoice?: string;
  toneAttributes: string[]; // e.g., ['helpful', 'responsive', 'empathetic']
  completedAt: string; // ISO timestamp
}

export interface Observatory {
  id: string;
  name: string;
  owner_id: string;
  onboarding_completed?: boolean;
  onboarding_data?: OnboardingData;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id?: string;
  stripe_price_id?: string;
  type: 'additional_business' | 'premium' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BusinessLimitInfo {
  canAddBusiness: boolean;
  currentCount: number;
  maxCount: number;
  requiresPayment: boolean;
}

export interface CreateBusinessCheckoutRequest {
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateBusinessCheckoutResponse {
  sessionId: string;
  sessionUrl: string;
}

// =============================================================================
// PR #4: Integration Connections
// =============================================================================

export type ConnectionType =
  | 'gmail'
  | 'calendar'
  | 'crm'
  | 'database'
  | 'imessage'
  | 'notes'
  | 'voicememos'
  | 'slack'
  | 'twitter';

export type ConnectionProvider =
  | 'google'
  | 'hubspot'
  | 'salesforce'
  | 'pipedrive'
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'apple'
  | 'slack'
  | 'twitter';

export type ConnectionStatus = 'active' | 'disconnected' | 'error' | 'pending';

export type SyncFrequency = 'realtime' | '15min' | '1hour' | 'manual';

export interface Connection {
  id: string;
  observatory_id: string;
  type: ConnectionType;
  provider: ConnectionProvider;
  status: ConnectionStatus;

  // OAuth tokens (encrypted)
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;

  // Provider-specific configuration
  config: ConnectionConfig;

  // Sync metadata
  last_synced_at?: string;
  sync_frequency: SyncFrequency;

  // Statistics
  items_synced: number;
  last_error?: string;
  error_count: number;

  created_at: string;
  updated_at: string;
}

export interface ConnectionConfig {
  // Gmail
  email?: string;
  labels?: string[];

  // Calendar
  calendars?: string[];

  // Database
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string; // Encrypted
  ssl?: boolean;
  tables?: string[];

  // CRM
  accountId?: string;
  apiVersion?: string;

  // Generic
  [key: string]: any;
}

export interface ConnectionSettings {
  id: string;
  connection_id: string;

  // Sync settings
  labels_to_monitor?: string[];
  folders_to_monitor?: string[];
  tables_to_monitor?: string[];
  calendars_to_monitor?: string[];

  // AI agent settings
  auto_respond_types?: string[];
  require_approval_for?: string[];

  // Data extraction settings
  extract_signatures: boolean;
  extract_contacts: boolean;
  extract_metadata: boolean;

  // Custom rules
  custom_rules?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

export interface BusinessInfoExtraction {
  id: string;
  observatory_id: string;
  connection_id?: string;

  // Extracted data
  field_name: string; // 'email', 'website', 'phone', 'address', 'team_size', etc.
  extracted_value: string;
  confidence?: number; // 0-1
  source_type?: string; // 'email_signature', 'calendar_location', 'crm_data', etc.

  // Application status
  applied: boolean;
  applied_at?: string;
  applied_by?: string;

  // Dismissal status
  dismissed: boolean;
  dismissed_at?: string;
  dismissed_by?: string;

  created_at: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

// Onboarding
export interface CompleteOnboardingRequest {
  onboardingData: OnboardingData;
}

export interface CompleteOnboardingResponse {
  observatory: Observatory;
  businessProfile: any; // References existing BusinessProfile from BusinessContext.ts
}

// Connections
export interface CreateConnectionRequest {
  type: ConnectionType;
  provider: ConnectionProvider;
  config?: Partial<ConnectionConfig>;
  settings?: Partial<ConnectionSettings>;
}

export interface UpdateConnectionRequest {
  status?: ConnectionStatus;
  config?: Partial<ConnectionConfig>;
  sync_frequency?: SyncFrequency;
}

export interface UpdateConnectionSettingsRequest {
  labels_to_monitor?: string[];
  folders_to_monitor?: string[];
  tables_to_monitor?: string[];
  auto_respond_types?: string[];
  require_approval_for?: string[];
  extract_signatures?: boolean;
  extract_contacts?: boolean;
  extract_metadata?: boolean;
}

export interface TestDatabaseConnectionRequest {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface TestDatabaseConnectionResponse {
  success: boolean;
  tables?: string[];
  error?: string;
}

export interface SyncConnectionRequest {
  force?: boolean; // Force sync even if recently synced
}

export interface SyncConnectionResponse {
  success: boolean;
  items_synced: number;
  errors?: string[];
}

// Business Info Extractions
export interface ApplyExtractionRequest {
  extractionId: string;
}

export interface DismissExtractionRequest {
  extractionId: string;
}

export interface PendingExtractionsResponse {
  extractions: BusinessInfoExtraction[];
  count: number;
}

// =============================================================================
// OAuth Flow Types
// =============================================================================

export interface OAuthInitiateRequest {
  type: ConnectionType;
  provider: ConnectionProvider;
  observatoryId: string;
  redirectUrl?: string;
}

export interface OAuthInitiateResponse {
  authUrl: string;
  state: string; // CSRF token
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
  error?: string;
}

export interface OAuthCallbackResponse {
  connection: Connection;
  message: string;
}

// =============================================================================
// Integration-Specific Types
// =============================================================================

// Gmail
export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  receivedAt: string;
  labels: string[];
}

export interface GmailSyncConfig {
  email: string;
  labels: string[];
  since?: string; // ISO timestamp
}

// Calendar
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
}

// CRM
export interface CRMContact {
  externalId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  lastActivity?: string;
  customFields?: Record<string, any>;
}

export interface CRMDeal {
  externalId: string;
  name: string;
  amount: number;
  stage: string;
  expectedCloseDate?: string;
  contactIds: string[];
}

// Database
export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  rowCount?: number;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
}

// Mac Companion (iMessage, Notes, Voice Memos)
export interface MacCompanionPairRequest {
  deviceName: string;
  deviceId: string;
}

export interface MacCompanionPairResponse {
  pairingCode: string;
  expiresAt: string;
}

export interface IMessageMessage {
  id: string;
  text: string;
  sender: string;
  recipient: string;
  sentAt: string;
  isFromMe: boolean;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  folder: string;
  modifiedAt: string;
  createdAt: string;
}

export interface VoiceMemo {
  id: string;
  filename: string;
  duration: number;
  recordedAt: string;
  audioData?: Buffer;
  transcription?: string;
}

// =============================================================================
// Stripe Webhook Event Types
// =============================================================================

export interface StripeCheckoutSessionCompletedEvent {
  type: 'checkout.session.completed';
  data: {
    object: {
      id: string;
      customer: string;
      subscription: string;
      metadata: {
        userId: string;
        type: string;
      };
    };
  };
}

export interface StripeSubscriptionUpdatedEvent {
  type: 'customer.subscription.updated';
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
    };
  };
}

export interface StripeSubscriptionDeletedEvent {
  type: 'customer.subscription.deleted';
  data: {
    object: {
      id: string;
      customer: string;
    };
  };
}

export type StripeWebhookEvent =
  | StripeCheckoutSessionCompletedEvent
  | StripeSubscriptionUpdatedEvent
  | StripeSubscriptionDeletedEvent;

// =============================================================================
// Frontend Component Props
// =============================================================================

export interface BusinessCardProps {
  business: Observatory;
  isActive: boolean;
  connectionCount: number;
  onClick: () => void;
}

export interface ConnectionCardProps {
  connection: Connection;
  onSettingsClick: () => void;
  onDisconnect: () => void;
}

export interface OnboardingFormProps {
  onComplete: (data: OnboardingData) => Promise<void>;
  onSkip?: () => void;
}

export interface BusinessSwitcherProps {
  businesses: Observatory[];
  activeBusiness: Observatory;
  onSwitch: (businessId: string) => void;
  canAddBusiness: boolean;
  onAddBusinessClick: () => void;
}

export interface ExtractionSuggestionProps {
  extraction: BusinessInfoExtraction;
  onApply: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}
