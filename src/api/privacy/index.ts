/**
 * Privacy API - Index
 *
 * Central export point for all GDPR compliance endpoints
 */

export {
  exportUserData,
  authenticateUser
} from './export-data.js';

export {
  deleteUserAccount,
  cancelAccountDeletion
} from './delete-account.js';

export {
  getConsentPreferences,
  updateConsentPreferences,
  withdrawConsent,
  getConsentHistory,
  hasConsent,
  ConsentType
} from './consent.js';

export type { ConsentRecord, ConsentPreferences } from './consent.js';
