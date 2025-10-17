"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function ObservatoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
        <div>Loading Observatory...</div>
      </div>
    );
  }

  if (!session) return null;

  const userName = session.user?.name?.split(" ")[0] || "Your";

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0b0f17",
      color: "#f7f7fb",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
    }}>
      {/* Header */}
      <header style={{
        padding: "20px 40px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#0f1320",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}>
            🔭
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{userName}&apos;s Observatory</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Jarvis AI Control Center</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 14, opacity: 0.8 }}>{session.user?.email}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              background: "#374151",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
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
        <section style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
            Welcome to Your Observatory
          </h1>
          <p style={{ fontSize: 16, opacity: 0.8, marginBottom: 24 }}>
            Connect your business to let Jarvis AI automate your operations 24/7
          </p>
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
          <StatCard title="Time Saved" value="0 hrs" subtitle="This week" />
          <StatCard title="DAWG AI Status" value="Not Connected" subtitle="Connect below" color="#ef4444" />
        </div>

        {/* Business Connection Section */}
        <section style={{
          background: "#1a1f2e",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: 32,
          marginBottom: 40,
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
            Connect Your Business
          </h2>
          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 24 }}>
            Connect your business accounts so Jarvis can observe and automate your operations
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
          }}>
            <ConnectionCard icon="💼" title="DAWG AI" subtitle="Music production AI" status="Not Connected" />
            <ConnectionCard icon="💬" title="iMessage" subtitle="Respond to messages" status="Not Connected" />
            <ConnectionCard icon="📧" title="Email" subtitle="Gmail automation" status="Not Connected" />
            <ConnectionCard icon="🔷" title="Salesforce" subtitle="CRM integration" status="Not Connected" />
            <ConnectionCard icon="🟠" title="HubSpot" subtitle="Marketing & sales" status="Not Connected" />
            <ConnectionCard icon="🐦" title="Twitter/X" subtitle="Social media posts" status="Not Connected" />
            <ConnectionCard icon="📱" title="SMS" subtitle="Text messages" status="Not Connected" />
            <ConnectionCard icon="📊" title="Analytics" subtitle="Business insights" status="Not Connected" />
          </div>
        </section>

        {/* Activity Feed */}
        <section style={{
          background: "#1a1f2e",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: 32,
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
            Recent Activity
          </h2>
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
            opacity: 0.6,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👀</div>
            <div style={{ fontSize: 16 }}>No activity yet</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>
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
      background: "#1a1f2e",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      padding: 24,
    }}>
      <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{subtitle}</div>
    </div>
  );
}

function ConnectionCard({ icon, title, subtitle, status }: {
  icon: string;
  title: string;
  subtitle: string;
  status: string;
}) {
  return (
    <button style={{
      background: "#0f1320",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: 20,
      cursor: "pointer",
      textAlign: "left",
      transition: "all 0.2s",
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.borderColor = "#667eea";
      e.currentTarget.style.background = "#1a1f2e";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
      e.currentTarget.style.background = "#0f1320";
    }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "#fff" }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8, color: "#fff" }}>{subtitle}</div>
      <div style={{
        fontSize: 11,
        color: "#ef4444",
        fontWeight: 500,
      }}>
        {status}
      </div>
    </button>
  );
}
