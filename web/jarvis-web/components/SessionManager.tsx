"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface SessionMetadata {
  ip?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
  fingerprint?: string;
  createdAt?: Date;
  lastActivity?: Date;
}

interface Session {
  sessionToken: string;
  expires: Date;
  metadata?: SessionMetadata;
  isCurrent: boolean;
}

interface SecurityEvent {
  type: string;
  userId: string;
  sessionToken?: string;
  metadata: SessionMetadata;
  details?: Record<string, any>;
  timestamp: Date;
}

export default function SessionManager() {
  const { data: session, status } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sessions" | "activity">("sessions");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSessions();
      fetchSecurityEvents();
    }
  }, [status]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sessions");

      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityEvents = async () => {
    try {
      const response = await fetch("/api/sessions/activity");

      if (!response.ok) {
        throw new Error("Failed to fetch security events");
      }

      const data = await response.json();
      setSecurityEvents(data.events || []);
    } catch (err) {
      console.error("Error fetching security events:", err);
    }
  };

  const revokeSession = async (sessionToken: string) => {
    try {
      const response = await fetch("/api/sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke session");
      }

      // Refresh sessions list
      await fetchSessions();
      await fetchSecurityEvents();
    } catch (err) {
      console.error("Error revoking session:", err);
      setError("Failed to revoke session");
    }
  };

  const revokeAllOtherSessions = async () => {
    if (!confirm("Are you sure you want to revoke all other sessions? You will remain logged in on this device.")) {
      return;
    }

    try {
      const response = await fetch("/api/sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ revokeAll: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke sessions");
      }

      // Refresh sessions list
      await fetchSessions();
      await fetchSecurityEvents();
    } catch (err) {
      console.error("Error revoking sessions:", err);
      setError("Failed to revoke sessions");
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "Unknown";
    const d = new Date(date);
    return d.toLocaleString();
  };

  const getDeviceIcon = (device?: string) => {
    if (!device) return "💻";
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes("mobile") || deviceLower.includes("iphone") || deviceLower.includes("android")) {
      return "📱";
    }
    if (deviceLower.includes("tablet") || deviceLower.includes("ipad")) {
      return "📱";
    }
    return "💻";
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "login":
        return "🔓";
      case "logout":
        return "🔒";
      case "session_created":
        return "✨";
      case "session_revoked":
        return "🗑️";
      case "suspicious_activity":
        return "⚠️";
      case "session_expired":
        return "⏰";
      default:
        return "📝";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="session-manager">
        <div className="loading">Loading session information...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="session-manager">
      <div className="session-manager-header">
        <h2>Session Management</h2>
        <p>Manage your active sessions and view security activity</p>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "sessions" ? "active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          Active Sessions ({sessions.length})
        </button>
        <button
          className={`tab ${activeTab === "activity" ? "active" : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          Security Activity
        </button>
      </div>

      {activeTab === "sessions" && (
        <div className="sessions-tab">
          <div className="sessions-actions">
            <button
              className="revoke-all-button"
              onClick={revokeAllOtherSessions}
              disabled={sessions.length <= 1}
            >
              Revoke All Other Sessions
            </button>
          </div>

          <div className="sessions-list">
            {sessions.length === 0 ? (
              <div className="empty-state">No active sessions found</div>
            ) : (
              sessions.map((sess) => (
                <div key={sess.sessionToken} className="session-card">
                  <div className="session-header">
                    <div className="device-info">
                      <span className="device-icon">
                        {getDeviceIcon(sess.metadata?.device)}
                      </span>
                      <div className="device-details">
                        <div className="device-name">
                          {sess.metadata?.device || "Unknown Device"}
                        </div>
                        <div className="device-meta">
                          {sess.metadata?.browser && (
                            <span>{sess.metadata.browser}</span>
                          )}
                          {sess.metadata?.os && (
                            <span> • {sess.metadata.os}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {sess.isCurrent && (
                      <span className="current-badge">Current Session</span>
                    )}
                  </div>

                  <div className="session-details">
                    {sess.metadata?.ip && (
                      <div className="detail-row">
                        <span className="label">IP Address:</span>
                        <span className="value">{sess.metadata.ip}</span>
                      </div>
                    )}
                    {sess.metadata?.location && (
                      <div className="detail-row">
                        <span className="label">Location:</span>
                        <span className="value">{sess.metadata.location}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="label">Last Active:</span>
                      <span className="value">
                        {formatDate(sess.metadata?.lastActivity)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Expires:</span>
                      <span className="value">{formatDate(sess.expires)}</span>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      className="revoke-button"
                      onClick={() => revokeSession(sess.sessionToken)}
                    >
                      Revoke Session
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="activity-tab">
          <div className="activity-list">
            {securityEvents.length === 0 ? (
              <div className="empty-state">No security events found</div>
            ) : (
              securityEvents.map((event, index) => (
                <div key={index} className="activity-card">
                  <div className="activity-icon">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-type">
                      {event.type.replace(/_/g, " ").toUpperCase()}
                    </div>
                    <div className="activity-details">
                      <span>
                        {event.metadata?.device || "Unknown Device"}
                      </span>
                      {event.metadata?.ip && (
                        <span> • {event.metadata.ip}</span>
                      )}
                      {event.metadata?.location && (
                        <span> • {event.metadata.location}</span>
                      )}
                    </div>
                    {event.details && (
                      <div className="activity-extra">
                        {JSON.stringify(event.details)}
                      </div>
                    )}
                  </div>
                  <div className="activity-time">
                    {formatDate(event.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .session-manager {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .session-manager-header {
          margin-bottom: 30px;
        }

        .session-manager-header h2 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .session-manager-header p {
          color: #666;
          font-size: 14px;
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-message button {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #666;
        }

        .tabs {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #eee;
          margin-bottom: 24px;
        }

        .tab {
          background: none;
          border: none;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          color: #666;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #000;
        }

        .tab.active {
          color: #000;
          border-bottom-color: #000;
        }

        .sessions-actions {
          margin-bottom: 20px;
        }

        .revoke-all-button {
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .revoke-all-button:hover {
          background: #cc0000;
        }

        .revoke-all-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .sessions-list,
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .session-card,
        .activity-card {
          background: white;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 20px;
          transition: box-shadow 0.2s;
        }

        .session-card:hover,
        .activity-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .device-info {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .device-icon {
          font-size: 32px;
        }

        .device-name {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .device-meta {
          font-size: 12px;
          color: #666;
        }

        .current-badge {
          background: #e6f7e6;
          color: #2d7a2d;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .session-details {
          margin-bottom: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f5f5f5;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .label {
          color: #666;
          font-size: 14px;
        }

        .value {
          font-size: 14px;
          font-weight: 500;
        }

        .revoke-button {
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
        }

        .revoke-button:hover {
          background: #cc0000;
        }

        .activity-card {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .activity-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-type {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .activity-details {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .activity-extra {
          font-size: 11px;
          color: #999;
          margin-top: 8px;
          padding: 8px;
          background: #f9f9f9;
          border-radius: 4px;
        }

        .activity-time {
          font-size: 12px;
          color: #999;
          flex-shrink: 0;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }
      `}</style>
    </div>
  );
}
