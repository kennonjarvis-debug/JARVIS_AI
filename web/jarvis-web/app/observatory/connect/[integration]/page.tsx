"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export const dynamic = 'force-dynamic';

// Integration configuration
const INTEGRATIONS = {
  "dawg-ai": {
    name: "DAWG AI",
    icon: "💼",
    color: "#8b5cf6",
    description: "Connect DAWG AI to automate your music production and business operations",
    benefits: [
      "Automated music production workflows",
      "Business automation for your music career",
      "AI-powered content generation",
      "Intelligent project management",
      "24/7 production assistance"
    ],
    permissions: [
      "Access to DAWG AI projects and workflows",
      "Read and create production files",
      "Manage automation settings",
      "View analytics and insights"
    ]
  },
  "imessage": {
    name: "iMessage",
    icon: "💬",
    color: "#10b981",
    description: "Connect iMessage to automatically respond to messages while you focus on what matters",
    benefits: [
      "Automated message responses 24/7",
      "Smart context-aware replies",
      "Priority message detection",
      "Custom response templates",
      "Never miss important conversations"
    ],
    permissions: [
      "Read incoming messages",
      "Send messages on your behalf",
      "Access conversation history",
      "Manage contacts and threads"
    ]
  },
  "gmail": {
    name: "Gmail",
    icon: "📧",
    color: "#ef4444",
    description: "Connect Gmail for intelligent email management and automated responses",
    benefits: [
      "Smart email categorization",
      "Automated email responses",
      "Priority inbox management",
      "Follow-up reminders",
      "Template-based replies"
    ],
    permissions: [
      "Read and send emails",
      "Manage labels and filters",
      "Access email metadata",
      "Create drafts and templates"
    ]
  },
  "email": {
    name: "Gmail",
    icon: "📧",
    color: "#ef4444",
    description: "Connect Gmail for intelligent email management and automated responses",
    benefits: [
      "Smart email categorization",
      "Automated email responses",
      "Priority inbox management",
      "Follow-up reminders",
      "Template-based replies"
    ],
    permissions: [
      "Read and send emails",
      "Manage labels and filters",
      "Access email metadata",
      "Create drafts and templates"
    ]
  },
  "salesforce": {
    name: "Salesforce",
    icon: "🔷",
    color: "#00a1e0",
    description: "Connect Salesforce for CRM automation and intelligent email campaigns",
    benefits: [
      "Automated lead follow-ups",
      "Smart email sequences",
      "Contact management automation",
      "Deal pipeline insights",
      "Custom workflow triggers"
    ],
    permissions: [
      "Read and update CRM records",
      "Send emails via Salesforce",
      "Access contact and lead data",
      "Manage automation workflows"
    ]
  }
};

export default function ConnectIntegrationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const integrationKey = params.integration as string;
  const integration = INTEGRATIONS[integrationKey as keyof typeof INTEGRATIONS];

  // Redirect to home if not authenticated
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0f17",
        color: "#fff",
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!session || !integration) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0f17",
        color: "#fff",
      }}>
        <div>Integration not found</div>
      </div>
    );
  }

  const handleConnect = async () => {
    setIsConnecting(true);

    // Mock connection flow - in production, this would initiate OAuth or API connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsConnecting(false);
    setShowSuccess(true);

    // Redirect after showing success
    setTimeout(() => {
      router.push("/observatory?connected=" + integrationKey);
    }, 1500);
  };

  const handleSkip = () => {
    router.push("/observatory");
  };

  if (showSuccess) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0f17",
        color: "#fff",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
            Successfully Connected!
          </div>
          <div style={{ fontSize: 16, opacity: 0.8 }}>
            {integration.name} is now connected to Jarvis
          </div>
        </div>
      </div>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0b0f17",
      color: "#f7f7fb",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
      padding: "40px 20px",
    }}>
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
      }}>
        {/* Header */}
        <div style={{
          textAlign: "center",
          marginBottom: 40,
        }}>
          <button
            onClick={handleSkip}
            style={{
              position: "absolute",
              top: 30,
              left: 30,
              padding: "8px 16px",
              borderRadius: 8,
              background: "transparent",
              color: "#9ca3af",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#1a1f2e";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#9ca3af";
            }}
          >
            ← Back to Observatory
          </button>

          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: integration.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            margin: "0 auto 24px",
            boxShadow: `0 10px 40px ${integration.color}40`,
          }}>
            {integration.icon}
          </div>

          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 12,
            background: `linear-gradient(135deg, ${integration.color} 0%, ${integration.color}cc 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Connect {integration.name}
          </h1>

          <p style={{
            fontSize: 16,
            opacity: 0.8,
            lineHeight: 1.6,
          }}>
            {integration.description}
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          marginBottom: 24,
        }}>
          {/* Benefits Section */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#1f2937",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ fontSize: 24 }}>✨</span>
              What You'll Get
            </h2>
            <ul style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}>
              {integration.benefits.map((benefit, index) => (
                <li key={index} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 12,
                  fontSize: 15,
                  color: "#4b5563",
                  lineHeight: 1.6,
                }}>
                  <span style={{
                    color: integration.color,
                    fontWeight: 700,
                    fontSize: 18,
                    marginTop: -2,
                  }}>
                    ✓
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Permissions Section */}
          <div style={{
            background: "#f9fafb",
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
          }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#1f2937",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ fontSize: 20 }}>🔐</span>
              Required Permissions
            </h2>
            <ul style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}>
              {integration.permissions.map((permission, index) => (
                <li key={index} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 10,
                  fontSize: 14,
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}>
                  <span style={{
                    color: "#9ca3af",
                    fontSize: 16,
                    marginTop: -1,
                  }}>
                    •
                  </span>
                  <span>{permission}</span>
                </li>
              ))}
            </ul>
            <p style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 16,
              marginBottom: 0,
              lineHeight: 1.5,
            }}>
              Your data is encrypted and secure. You can revoke access at any time.
            </p>
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            style={{
              width: "100%",
              padding: "16px 32px",
              borderRadius: 12,
              background: isConnecting
                ? "#9ca3af"
                : `linear-gradient(135deg, ${integration.color} 0%, ${integration.color}dd 100%)`,
              color: "#fff",
              border: "none",
              cursor: isConnecting ? "not-allowed" : "pointer",
              fontSize: 18,
              fontWeight: 700,
              boxShadow: isConnecting
                ? "none"
                : `0 10px 30px ${integration.color}50`,
              transition: "all 0.3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
            onMouseOver={(e) => {
              if (!isConnecting) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 15px 40px ${integration.color}60`;
              }
            }}
            onMouseOut={(e) => {
              if (!isConnecting) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 10px 30px ${integration.color}50`;
              }
            }}
          >
            {isConnecting ? (
              <>
                <span style={{
                  width: 20,
                  height: 20,
                  border: "3px solid #fff",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}></span>
                Connecting...
              </>
            ) : (
              <>
                <span>{integration.icon}</span>
                Connect {integration.name}
              </>
            )}
          </button>
        </div>

        {/* Skip Button */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleSkip}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              background: "transparent",
              color: "#9ca3af",
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "#9ca3af";
            }}
          >
            Skip for now
          </button>
        </div>

        {/* Trust Indicators */}
        <div style={{
          marginTop: 40,
          textAlign: "center",
          padding: "24px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{
            fontSize: 12,
            color: "#9ca3af",
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontWeight: 600,
          }}>
            Trusted By Professionals
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            fontSize: 13,
            color: "#6b7280",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>🔒</span>
              <span>Bank-Level Encryption</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚡</span>
              <span>Instant Setup</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>🛡️</span>
              <span>SOC 2 Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spinning Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
