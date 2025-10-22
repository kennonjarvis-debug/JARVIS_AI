/**
 * Central configuration for all tools, models, and rate limits
 */

export const CONFIG = {
  // Anthropic model configuration
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',

  // Timezone for all cron jobs (America/Phoenix = MST/Arizona, no DST)
  timezone: process.env.CRON_TIMEZONE ?? 'America/Phoenix',

  // HubSpot Private App Token (NOT API key - those were sunset in 2022)
  hubspotToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? '',
  hubspotPortalId: process.env.HUBSPOT_PORTAL_ID ?? '',

  // Brevo (formerly SendGrid) - 300 emails/day on free tier
  brevoApiKey: process.env.BREVO_API_KEY ?? '',
  brevoDailyLimit: parseInt(process.env.BREVO_DAILY_LIMIT ?? '300'),
  brevoBatchSize: 300, // Don't exceed free tier in single batch

  // Buffer OAuth2 (NOT simple API key)
  bufferAccessToken: process.env.BUFFER_ACCESS_TOKEN ?? '',
  bufferClientId: process.env.BUFFER_CLIENT_ID ?? '',
  bufferClientSecret: process.env.BUFFER_CLIENT_SECRET ?? '',

  // Rate limits
  bufferRateLimitPerMin: parseInt(process.env.BUFFER_RATE_LIMIT_PER_MIN ?? '10'),
  hubspotRateLimitPer10s: parseInt(process.env.HUBSPOT_RATE_LIMIT_PER_10S ?? '100'),

  // Cost controls
  maxCostPerDay: parseFloat(process.env.MAX_COST_PER_DAY ?? '50'),

  // Notion
  notionApiKey: process.env.NOTION_API_KEY ?? '',
  notionBlogDatabaseId: process.env.NOTION_BLOG_DATABASE_ID ?? '',

  // Plausible Analytics
  plausibleApiUrl: process.env.PLAUSIBLE_API_URL ?? 'https://plausible.io',
  plausibleSiteId: process.env.PLAUSIBLE_SITE_ID ?? '',
  plausibleApiKey: process.env.PLAUSIBLE_API_KEY ?? '',

  // Discord
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? '',

  // Admin alerts
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@dawgai.com',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
} as const;

/**
 * Risk thresholds for decision engine
 */
export const RISK_THRESHOLDS = {
  // Email campaign recipient thresholds
  emailRecipients: {
    low: 50,        // < 50 recipients = LOW risk
    medium: 300,    // 50-300 = MEDIUM risk
    high: 300,      // > 300 = HIGH risk (Brevo free limit)
  },

  // Financial thresholds
  financial: {
    low: 10,        // < $10 = LOW risk
    medium: 50,     // $10-50 = MEDIUM risk
    high: 100,      // $50-100 = HIGH risk
    critical: 100,  // > $100 = CRITICAL (always require approval)
  },

  // Confidence thresholds per risk level
  confidenceRequired: {
    low: 0.7,
    medium: 0.8,
    high: 0.9,
    critical: 1.0,  // Always require approval
  },
} as const;

/**
 * Validate configuration at startup
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Critical API keys
  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push('ANTHROPIC_API_KEY is required');
  }

  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) {
    errors.push('Supabase configuration is required (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
  }

  // Warn about optional integrations
  if (!CONFIG.hubspotToken) {
    console.warn('⚠️  HubSpot not configured (HUBSPOT_PRIVATE_APP_TOKEN)');
  }

  if (!CONFIG.brevoApiKey) {
    console.warn('⚠️  Brevo/Email not configured (BREVO_API_KEY)');
  }

  if (!CONFIG.bufferAccessToken) {
    console.warn('⚠️  Buffer not configured (BUFFER_ACCESS_TOKEN)');
  }

  if (!CONFIG.discordWebhookUrl) {
    console.warn('⚠️  Discord notifications not configured (DISCORD_WEBHOOK_URL)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
