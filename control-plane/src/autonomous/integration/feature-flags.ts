/**
 * Feature Flags for Jarvis Autonomous Features
 * All features disabled by default - enable gradually
 */

export interface FeatureFlags {
  ADAPTIVE_ENGINE_V2: boolean;
  PROACTIVE_AGENT: boolean;
  DOMAIN_ROUTING: boolean;
  INSIGHT_ENGINE: boolean;
  AUTONOMOUS_NOTIFICATIONS: boolean;
}

export const AUTONOMOUS_FEATURES: FeatureFlags = {
  ADAPTIVE_ENGINE_V2: false,
  PROACTIVE_AGENT: false,
  DOMAIN_ROUTING: false,
  INSIGHT_ENGINE: false,
  AUTONOMOUS_NOTIFICATIONS: false
};

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  // Check environment override first
  const envKey = `FEATURE_${feature}`;
  const override = process.env[envKey];
  if (override !== undefined) {
    return override === 'true';
  }

  // Fall back to default config
  return AUTONOMOUS_FEATURES[feature];
}

export function enableFeature(feature: keyof FeatureFlags): void {
  AUTONOMOUS_FEATURES[feature] = true;
}

export function disableFeature(feature: keyof FeatureFlags): void {
  AUTONOMOUS_FEATURES[feature] = false;
}

export function disableAllFeatures(): void {
  Object.keys(AUTONOMOUS_FEATURES).forEach(key => {
    AUTONOMOUS_FEATURES[key as keyof FeatureFlags] = false;
  });
}

export function getFeatureStatus(): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  Object.keys(AUTONOMOUS_FEATURES).forEach(key => {
    status[key] = isFeatureEnabled(key as keyof FeatureFlags);
  });
  return status;
}
