"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface Permission {
  icon: string;
  title: string;
  description: string;
}

interface ConnectionLayoutProps {
  icon: string;
  title: string;
  description: string;
  permissions: Permission[];
  onConnect: () => Promise<void>;
}

export default function ConnectionLayout({
  icon,
  title,
  description,
  permissions,
  onConnect,
}: ConnectionLayoutProps) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
      setIsConnected(true);
      // Extract connection ID from current path
      const pathParts = window.location.pathname.split('/');
      const connectionId = pathParts[pathParts.length - 1];
      // Redirect back to observatory after 1.5 seconds with success parameter
      setTimeout(() => {
        router.push(`/observatory?connected=${connectionId}`);
      }, 1500);
    } catch (error) {
      console.error("Connection error:", error);
      setIsConnecting(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0f17",
        color: "#f7f7fb",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        {/* Back Button */}
        <button
          onClick={() => router.push("/observatory")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 6,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#f7f7fb",
            cursor: "pointer",
            fontSize: 14,
            marginBottom: 32,
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#1a1f2e";
            e.currentTarget.style.borderColor = "#667eea";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          <span>←</span>
          <span>Back to Observatory</span>
        </button>

        {/* Connection Card */}
        <div
          style={{
            background: "#1a1f2e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: 40,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
              }}
            >
              {icon}
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                Connect {title}
              </h1>
              <p style={{ fontSize: 14, opacity: 0.6 }}>
                Authorization Required
              </p>
            </div>
          </div>

          {/* Description */}
          <div
            style={{
              background: "#0f1320",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8,
              padding: 20,
              marginBottom: 32,
            }}
          >
            <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.9 }}>
              {description}
            </p>
          </div>

          {/* Permissions */}
          <div style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🔐</span>
              <span>Permissions Requested</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {permissions.map((permission, index) => (
                <div
                  key={index}
                  style={{
                    background: "#0f1320",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    padding: 16,
                    display: "flex",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 24, flexShrink: 0 }}>
                    {permission.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      {permission.title}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>
                      {permission.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Success Message */}
          {isConnected && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>✓</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#10b981" }}>
                  Connected Successfully!
                </div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  Redirecting back to Observatory...
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => router.push("/observatory")}
              disabled={isConnecting || isConnected}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f7f7fb",
                cursor: isConnecting || isConnected ? "not-allowed" : "pointer",
                fontSize: 15,
                fontWeight: 500,
                opacity: isConnecting || isConnected ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                if (!isConnecting && !isConnected) {
                  e.currentTarget.style.background = "#1a1f2e";
                  e.currentTarget.style.borderColor = "#667eea";
                }
              }}
              onMouseOut={(e) => {
                if (!isConnecting && !isConnected) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={isConnecting || isConnected}
              style={{
                padding: "12px 32px",
                borderRadius: 8,
                background: isConnected
                  ? "#10b981"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                color: "#fff",
                cursor: isConnecting || isConnected ? "not-allowed" : "pointer",
                fontSize: 15,
                fontWeight: 600,
                opacity: isConnecting ? 0.7 : 1,
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              }}
              onMouseOver={(e) => {
                if (!isConnecting && !isConnected) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
                }
              }}
              onMouseOut={(e) => {
                if (!isConnecting && !isConnected) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                }
              }}
            >
              {isConnecting ? "Connecting..." : isConnected ? "Connected!" : "Connect"}
            </button>
          </div>

          {/* Security Note */}
          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 8,
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            <strong>🔒 Security Note:</strong> Jarvis uses industry-standard OAuth 2.0
            for secure authentication. Your credentials are never stored on our servers.
          </div>
        </div>
      </div>
    </main>
  );
}
