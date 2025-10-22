"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function BusinessOnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

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
      }}>
        <div style={{ color: "#111827" }}>Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create business");
      }

      // Redirect to the business dashboard
      router.push(`/observatory/${data.business.slug}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#ffffff",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        padding: "20px 40px",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
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
            🤖
          </div>
          <strong style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Jarvis AI</strong>
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}>
        <div style={{
          maxWidth: 600,
          width: "100%",
        }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{
              fontSize: 72,
              marginBottom: 24,
            }}>
              🏢
            </div>
            <h1 style={{
              fontSize: 48,
              fontWeight: 800,
              marginBottom: 16,
              color: "#111827",
            }}>
              Create Your Business
            </h1>
            <p style={{
              fontSize: 20,
              color: "#6b7280",
              lineHeight: 1.6,
            }}>
              Set up your business workspace to start managing your AI operations
            </p>
          </div>

          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              color: "#dc2626",
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 40,
          }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 8,
              }}>
                Business Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 16,
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#ef4444";
                  e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
              />
              <p style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 8,
              }}>
                This will be the name of your workspace
              </p>
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 8,
              }}>
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell us about your business..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 16,
                  outline: "none",
                  transition: "all 0.2s",
                  resize: "vertical",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#ef4444";
                  e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{
              background: "#fef2f2",
              border: "1px solid #fee2e2",
              borderRadius: 12,
              padding: 20,
              marginBottom: 32,
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#dc2626",
                marginBottom: 12,
              }}>
                What You Get:
              </h3>
              <ul style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}>
                <FeatureItem icon="✓" text="7-day free trial" />
                <FeatureItem icon="✓" text="Unlimited team members" />
                <FeatureItem icon="✓" text="AI-powered automation" />
                <FeatureItem icon="✓" text="Integration with your tools" />
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 10,
                background: loading || !formData.name.trim()
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "#fff",
                border: "none",
                cursor: loading || !formData.name.trim() ? "not-allowed" : "pointer",
                fontSize: 18,
                fontWeight: 600,
                boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
              }}
            >
              {loading ? "Creating..." : "Create Business & Start Trial"}
            </button>
          </form>

          <p style={{
            textAlign: "center",
            fontSize: 14,
            color: "#6b7280",
            marginTop: 24,
          }}>
            By creating a business, you agree to our{" "}
            <a href="/terms" style={{ color: "#ef4444", textDecoration: "none" }}>
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" style={{ color: "#ef4444", textDecoration: "none" }}>
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <li style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      fontSize: 14,
      color: "#374151",
    }}>
      <span style={{
        fontSize: 16,
        color: "#dc2626",
        fontWeight: 700,
      }}>
        {icon}
      </span>
      <span>{text}</span>
    </li>
  );
}
