/**
 * Rate Limit Status Component
 *
 * Displays current rate limit usage with visual indicators
 * Shows upgrade CTA when limits are approaching or exceeded
 */

'use client';

import React, { useEffect, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitData {
  tier: string;
  quotas: {
    api: {
      hourly: {
        limit: number;
        used: number;
        remaining: number;
        resetAt: string;
        percentage: number;
      };
      minute: {
        limit: number;
        used: number;
        remaining: number;
        resetAt: string;
        percentage: number;
      };
    };
    ai: {
      daily: {
        limit: number;
        used: number;
        remaining: number;
        resetAt: string;
        percentage: number;
      };
    };
  };
  status: {
    banned: boolean;
    bannedUntil?: string;
  };
  violations: {
    recent: number;
    history: Array<{
      timestamp: string;
      endpoint: string;
      limit: number;
      attempted: number;
    }>;
  };
}

interface RateLimitStatusProps {
  /** Refresh interval in milliseconds (default: 30000 = 30s) */
  refreshInterval?: number;
  /** Show detailed breakdown (default: true) */
  showDetails?: boolean;
  /** Compact mode (default: false) */
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RateLimitStatus({
  refreshInterval = 30000,
  showDetails = true,
  compact = false,
}: RateLimitStatusProps) {
  const [data, setData] = useState<RateLimitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch rate limit status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/rate-limits/status', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rate limit status');
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Loading state
  if (loading) {
    return (
      <div className="rate-limit-status loading">
        <div className="spinner" />
        <p>Loading rate limit status...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rate-limit-status error">
        <p>Error: {error}</p>
        <button onClick={fetchStatus}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Compact mode - single line summary
  if (compact) {
    return (
      <div className="rate-limit-status compact">
        <div className="tier-badge">{data.tier}</div>
        <div className="quota-summary">
          API: {data.quotas.api.hourly.remaining}/{data.quotas.api.hourly.limit} left
        </div>
        <div className="quota-summary">
          AI: {data.quotas.ai.daily.remaining}/{data.quotas.ai.daily.limit} left
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div className="rate-limit-status">
      {/* Header */}
      <div className="status-header">
        <h3>Rate Limits</h3>
        <div className="tier-badge">{data.tier}</div>
      </div>

      {/* Ban Warning */}
      {data.status.banned && (
        <div className="ban-warning">
          <h4>⚠️ Account Temporarily Restricted</h4>
          <p>
            Your account has been temporarily restricted due to excessive rate limit violations.
            {data.status.bannedUntil && (
              <> Access will be restored at {new Date(data.status.bannedUntil).toLocaleString()}.</>
            )}
          </p>
        </div>
      )}

      {/* AI Requests (Daily) */}
      <QuotaCard
        title="AI Requests"
        subtitle="Daily Limit"
        quota={data.quotas.ai.daily}
        showUpgradeCTA={data.quotas.ai.daily.percentage > 80}
        currentTier={data.tier}
      />

      {/* API Calls (Hourly) */}
      {showDetails && (
        <QuotaCard
          title="API Calls"
          subtitle="Hourly Limit"
          quota={data.quotas.api.hourly}
          showUpgradeCTA={data.quotas.api.hourly.percentage > 80}
          currentTier={data.tier}
        />
      )}

      {/* Violations */}
      {showDetails && data.violations.recent > 0 && (
        <div className="violations-section">
          <h4>Recent Violations</h4>
          <p>{data.violations.recent} violations in the past hour</p>
          {data.violations.history.length > 0 && (
            <div className="violations-list">
              {data.violations.history.map((v, i) => (
                <div key={i} className="violation-item">
                  <span className="endpoint">{v.endpoint}</span>
                  <span className="time">
                    {new Date(v.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface QuotaCardProps {
  title: string;
  subtitle: string;
  quota: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string;
    percentage: number;
  };
  showUpgradeCTA: boolean;
  currentTier: string;
}

function QuotaCard({ title, subtitle, quota, showUpgradeCTA, currentTier }: QuotaCardProps) {
  const isUnlimited = quota.limit === -1;
  const percentage = Math.min(100, quota.percentage);
  const status = getQuotaStatus(percentage);

  // Calculate time until reset
  const resetDate = new Date(quota.resetAt);
  const now = new Date();
  const timeUntilReset = resetDate.getTime() - now.getTime();
  const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className={`quota-card ${status}`}>
      <div className="quota-header">
        <div>
          <h4>{title}</h4>
          <p className="subtitle">{subtitle}</p>
        </div>
        {isUnlimited ? (
          <div className="unlimited-badge">∞ Unlimited</div>
        ) : (
          <div className="usage-text">
            <strong>{quota.used}</strong> / {quota.limit}
          </div>
        )}
      </div>

      {!isUnlimited && (
        <>
          {/* Progress Bar */}
          <div className="progress-bar">
            <div
              className={`progress-fill ${status}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="quota-stats">
            <div className="stat">
              <span className="label">Remaining</span>
              <span className="value">{quota.remaining}</span>
            </div>
            <div className="stat">
              <span className="label">Resets in</span>
              <span className="value">
                {hoursUntilReset > 0 ? `${hoursUntilReset}h ` : ''}
                {minutesUntilReset}m
              </span>
            </div>
            <div className="stat">
              <span className="label">Usage</span>
              <span className="value">{percentage}%</span>
            </div>
          </div>
        </>
      )}

      {/* Upgrade CTA */}
      {showUpgradeCTA && !isUnlimited && (
        <UpgradeCTA currentTier={currentTier} />
      )}
    </div>
  );
}

function UpgradeCTA({ currentTier }: { currentTier: string }) {
  const nextTier = getNextTier(currentTier);

  return (
    <div className="upgrade-cta">
      <p>
        {currentTier === 'FREE_TRIAL' || currentTier === 'ANONYMOUS'
          ? 'Upgrade to unlock higher limits'
          : `Upgrade to ${nextTier} for more capacity`}
      </p>
      <a href="/pricing" className="upgrade-button">
        View Plans
      </a>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getQuotaStatus(percentage: number): 'normal' | 'warning' | 'danger' | 'critical' {
  if (percentage >= 100) return 'critical';
  if (percentage >= 90) return 'danger';
  if (percentage >= 75) return 'warning';
  return 'normal';
}

function getNextTier(currentTier: string): string {
  switch (currentTier) {
    case 'FREE_TRIAL':
    case 'ANONYMOUS':
      return 'Starter';
    case 'STARTER':
      return 'Professional';
    case 'PROFESSIONAL':
      return 'Enterprise';
    default:
      return 'Professional';
  }
}

// ============================================================================
// STYLES (Tailwind CSS classes or CSS-in-JS)
// ============================================================================

// Note: In a real app, you'd use Tailwind or styled-components.
// This is a placeholder to show the structure.
const styles = `
.rate-limit-status {
  padding: 1.5rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.tier-badge {
  padding: 0.25rem 0.75rem;
  background: #3b82f6;
  color: white;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.quota-card {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.quota-card.warning {
  border-color: #fbbf24;
  background: #fef3c7;
}

.quota-card.danger {
  border-color: #f87171;
  background: #fee2e2;
}

.quota-card.critical {
  border-color: #dc2626;
  background: #fecaca;
}

.progress-bar {
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
  margin: 0.75rem 0;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.progress-fill.warning {
  background: #fbbf24;
}

.progress-fill.danger {
  background: #f87171;
}

.progress-fill.critical {
  background: #dc2626;
}

.quota-stats {
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat .label {
  font-size: 0.75rem;
  color: #6b7280;
}

.stat .value {
  font-weight: 600;
  color: #111827;
}

.upgrade-cta {
  margin-top: 1rem;
  padding: 1rem;
  background: #eff6ff;
  border-radius: 0.375rem;
  text-align: center;
}

.upgrade-button {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border-radius: 0.375rem;
  text-decoration: none;
  font-weight: 600;
}

.ban-warning {
  padding: 1rem;
  margin-bottom: 1rem;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 0.375rem;
}

.violations-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.375rem;
}

.violations-list {
  margin-top: 0.5rem;
}

.violation-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.compact {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem;
}
`;
