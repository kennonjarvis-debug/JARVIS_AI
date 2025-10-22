"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function ObservatoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [connectedService, setConnectedService] = useState("");

  // Mock subscription data
  const [currentPlan] = useState("Starter");
  const [observatoriesUsed] = useState(1);
  const [observatoriesLimit] = useState(1);

  // Check for connection success
  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected) {
      const serviceMap: Record<string, string> = {
        "dawg-ai": "DAWG AI",
        "imessage": "iMessage",
        "email": "Gmail",
        "gmail": "Gmail",
        "salesforce": "Salesforce",
        "hubspot": "HubSpot",
        "twitter": "Twitter/X",
        "sms": "SMS",
        "analytics": "Analytics"
      };

      const serviceName = serviceMap[connected] || connected;
      setConnectedService(serviceName);
      setShowSuccessBanner(true);

      // Auto-hide banner after 5 seconds
      setTimeout(() => {
        setShowSuccessBanner(false);
      }, 5000);

      // Clean up URL
      router.replace("/observatory", { scroll: false });
    }
  }, [searchParams, router]);

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
        background: "#ffffff",
        color: "#111827",
      }}>
        <div>Loading Observatory...</div>
      </div>
    );
  }

  if (!session) return null;

  const userName = session.user?.name?.split(" ")[0] || "Your";

  return (
    <main style={{
      minHeight: "100vh",
      background: "#ffffff",
      color: "#111827",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
    }}>
      {/* Success Banner */}
      {showSuccessBanner && (
        <div style={{
          position: "fixed",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "#fff",
          padding: "16px 32px",
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(16, 185, 129, 0.4)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 16,
          fontWeight: 600,
          animation: "slideDown 0.3s ease-out",
        }}>
          <span style={{ fontSize: 24 }}>✅</span>
          <span>{connectedService} connected successfully!</span>
          <button
            onClick={() => setShowSuccessBanner(false)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              width: 24,
              height: 24,
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              marginLeft: 8,
            }}
          >
            ×
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      {/* Header */}
      <header style={{
        padding: "20px 60px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fff",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}>
            🔭
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{userName}&apos;s Observatory</div>
            <div style={{
              fontSize: 12,
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <span>Jarvis AI Control Center</span>
              <span style={{ color: "#d1d5db" }}>•</span>
              <span style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <span style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                }}></span>
                <span style={{ fontWeight: 600, color: "#111827" }}>{currentPlan} Plan</span>
              </span>
              <span style={{ color: "#d1d5db" }}>•</span>
              <span>
                <strong style={{ color: "#111827" }}>{observatoriesUsed}</strong>/{observatoriesLimit} Observatories
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push('/observatory/billing')}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              background: "#f9fafb",
              color: "#374151",
              border: "1px solid #e5e7eb",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>💳</span>
            <span>Billing</span>
          </button>
          <div style={{ fontSize: 14, color: "#6b7280" }}>{session.user?.email}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              background: "#fff",
              color: "#374151",
              border: "2px solid #e5e7eb",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: 40,
      }}>
        {/* Welcome Section */}
        <section style={{
          marginBottom: 40,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12, color: "#111827" }}>
              Welcome to Your Observatory
            </h1>
            <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 24 }}>
              Connect your business to let Jarvis AI automate your operations 24/7
            </p>
          </div>
          <button
            onClick={() => router.push('/observatory/new')}
            style={{
              padding: "14px 24px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(239,68,68,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            <span>Add New Observatory</span>
          </button>
        </section>

        {/* Stats Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 24,
          marginBottom: 40,
        }}>
          <StatCard title="Messages Handled" value="0" subtitle="iMessages, DMs, emails" />
          <StatCard title="Posts Created" value="0" subtitle="Social media automation" />
          <StatCard title="Tasks Automated" value="0" subtitle="Active automations" />
          <StatCard title="Integrations" value="0/8" subtitle="Connect your accounts" color="#ef4444" />
        </div>

        {/* Business Connection Section */}
        <section style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 32,
          marginBottom: 40,
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#111827" }}>
            Connect Your Business
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
            Connect your business accounts so Jarvis can observe and automate your operations
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
          }}>
            <ConnectionCard icon="💼" title="DAWG AI" subtitle="Music production AI" link="/observatory/connect/dawg-ai" />
            <ConnectionCard icon="💬" title="iMessage" subtitle="Respond to messages" link="/observatory/connect/imessage" />
            <ConnectionCard icon="📧" title="Email" subtitle="Gmail automation" link="/observatory/connect/email" />
            <ConnectionCard icon="🔷" title="Salesforce" subtitle="CRM integration" link="/observatory/connect/salesforce" />
            <ConnectionCard icon="🟠" title="HubSpot" subtitle="Marketing & sales" link="/observatory/connect/hubspot" />
            <ConnectionCard icon="🐦" title="Twitter/X" subtitle="Social media posts" link="/observatory/connect/twitter" />
            <ConnectionCard icon="📱" title="SMS" subtitle="Text messages" link="/observatory/connect/sms" />
            <ConnectionCard icon="📊" title="Analytics" subtitle="Business insights" link="/observatory/connect/analytics" />
          </div>
        </section>

        {/* Activity Feed */}
        <section style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 32,
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#111827" }}>
            Recent Activity
          </h2>
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👀</div>
            <div style={{ fontSize: 16, color: "#111827" }}>No activity yet</div>
            <div style={{ fontSize: 14, marginTop: 8, color: "#6b7280" }}>
              Connect your business accounts to start observing
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ title, value, subtitle, color = "#10b981" }: {
  title: string;
  value: string;
  subtitle: string;
  color?: string;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 24,
    }}>
      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{subtitle}</div>
    </div>
  );
}

function ConnectionCard({ icon, title, subtitle, link }: {
  icon: string;
  title: string;
  subtitle: string;
  link?: string;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (link) {
      router.push(link);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!link}
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 20,
        cursor: link ? "pointer" : "not-allowed",
        textAlign: "left",
        transition: "all 0.2s",
        opacity: link ? 1 : 0.5,
      }}
      onMouseOver={(e) => {
        if (link) {
          e.currentTarget.style.borderColor = "#ef4444";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(239,68,68,0.15)";
        }
      }}
      onMouseOut={(e) => {
        if (link) {
          e.currentTarget.style.borderColor = "#e5e7eb";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "#111827" }}>{title}</div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{subtitle}</div>
    </button>
  );
}
