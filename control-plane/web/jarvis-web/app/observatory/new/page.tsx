"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PlanLimits {
  [key: string]: {
    max: number | string;
    current: number;
  };
}

export default function NewObservatoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [observatoryName, setObservatoryName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock current plan data
  const currentPlan = "starter";
  const planLimits: PlanLimits = {
    starter: { max: 1, current: 1 },
    professional: { max: 5, current: 1 },
    enterprise: { max: "unlimited", current: 1 },
  };

  const limit = planLimits[currentPlan];
  const canCreate = typeof limit.max === 'string' || limit.current < limit.max;

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
        <div>Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!observatoryName.trim()) {
      setError("Observatory name is required");
      return;
    }

    if (!canCreate) {
      setError(`You've reached the limit of ${limit.max} observatories on your ${currentPlan} plan. Please upgrade to create more.`);
      return;
    }

    setIsCreating(true);

    // Mock API call - simulate creation
    setTimeout(() => {
      setIsCreating(false);
      router.push('/observatory?created=true');
    }, 1500);
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#ffffff",
      color: "#111827",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
    }}>
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
            borderRadius: 10,
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}>
            🔭
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Create New Observatory</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Set up a new business automation hub</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push('/observatory')}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <div style={{ fontSize: 14, color: "#6b7280" }}>{session.user?.email}</div>
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
        maxWidth: 800,
        margin: "0 auto",
        padding: "60px 40px",
      }}>
        {/* Plan Status Banner */}
        {!canCreate ? (
          <div style={{
            background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
            border: "2px solid #fecaca",
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#991b1b",
                marginBottom: 8,
              }}>
                Observatory Limit Reached
              </h3>
              <p style={{
                fontSize: 14,
                color: "#6b7280",
                marginBottom: 12,
              }}>
                You've used {limit.current} of {limit.max} observatories on your {currentPlan} plan.
                Upgrade to create more observatories.
              </p>
              <button
                onClick={() => router.push('/observatory/billing')}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                View Plans
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 12,
            padding: 20,
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <div style={{ fontSize: 24 }}>✓</div>
            <div style={{ fontSize: 14, color: "#15803d" }}>
              <strong>Available:</strong> {typeof limit.max === 'string' ? 'Unlimited' : limit.max - limit.current} more observatory slots on your {currentPlan} plan
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 40,
          }}>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 8,
            }}>
              Observatory Details
            </h2>
            <p style={{
              fontSize: 15,
              color: "#6b7280",
              marginBottom: 32,
            }}>
              Create a new observatory to manage another business or project
            </p>

            {error && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
                color: "#991b1b",
                fontSize: 14,
              }}>
                {error}
              </div>
            )}

            {/* Observatory Name */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 8,
              }}>
                Observatory Name *
              </label>
              <input
                type="text"
                value={observatoryName}
                onChange={(e) => setObservatoryName(e.target.value)}
                placeholder="e.g., My Coffee Shop, Tech Startup, Consulting Business"
                disabled={!canCreate}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "2px solid #e5e7eb",
                  fontSize: 15,
                  color: "#111827",
                  background: canCreate ? "#fff" : "#f9fafb",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  if (canCreate) e.currentTarget.style.borderColor = "#ef4444";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              />
              <p style={{
                fontSize: 13,
                color: "#6b7280",
                marginTop: 6,
              }}>
                Choose a name that describes your business or project
              </p>
            </div>

            {/* Business Type */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 8,
              }}>
                Business Type
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={!canCreate}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "2px solid #e5e7eb",
                  fontSize: 15,
                  color: businessType ? "#111827" : "#6b7280",
                  background: canCreate ? "#fff" : "#f9fafb",
                  outline: "none",
                  cursor: canCreate ? "pointer" : "not-allowed",
                }}
              >
                <option value="">Select a business type...</option>
                <option value="ecommerce">E-commerce</option>
                <option value="saas">SaaS / Software</option>
                <option value="consulting">Consulting / Services</option>
                <option value="agency">Marketing / Agency</option>
                <option value="retail">Retail / Restaurant</option>
                <option value="music">Music / Entertainment</option>
                <option value="realestate">Real Estate</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education / Training</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 32 }}>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 8,
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this observatory will manage..."
                rows={4}
                disabled={!canCreate}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "2px solid #e5e7eb",
                  fontSize: 15,
                  color: "#111827",
                  background: canCreate ? "#fff" : "#f9fafb",
                  outline: "none",
                  fontFamily: "inherit",
                  resize: "vertical",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  if (canCreate) e.currentTarget.style.borderColor = "#ef4444";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              />
            </div>

            {/* What's Included */}
            <div style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 24,
              marginBottom: 32,
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 20 }}>🎁</span>
                What's Included
              </h3>
              <ul style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}>
                {[
                  "Dedicated automation hub for this business",
                  "Separate integration connections",
                  "Independent analytics and reporting",
                  "Custom workflow automation",
                  "Isolated activity monitoring"
                ].map((feature, index) => (
                  <li key={index} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                    fontSize: 14,
                    color: "#374151",
                  }}>
                    <span style={{
                      color: "#ef4444",
                      fontSize: 16,
                      fontWeight: 700,
                    }}>
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canCreate || isCreating || !observatoryName.trim()}
              style={{
                width: "100%",
                padding: "16px 32px",
                borderRadius: 10,
                background: !canCreate || isCreating || !observatoryName.trim()
                  ? "#e5e7eb"
                  : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: !canCreate || isCreating || !observatoryName.trim() ? "#9ca3af" : "#fff",
                border: "none",
                cursor: !canCreate || isCreating || !observatoryName.trim() ? "not-allowed" : "pointer",
                fontSize: 16,
                fontWeight: 600,
                boxShadow: canCreate && !isCreating && observatoryName.trim()
                  ? "0 4px 12px rgba(239,68,68,0.3)"
                  : "none",
                transition: "all 0.2s",
              }}
            >
              {isCreating ? "Creating Observatory..." : "Create Observatory"}
            </button>
          </div>
        </form>

        {/* Help Section */}
        <div style={{
          marginTop: 40,
          padding: 24,
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 12,
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#92400e",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ fontSize: 20 }}>💡</span>
            Need More Observatories?
          </h3>
          <p style={{
            fontSize: 14,
            color: "#78350f",
            marginBottom: 16,
          }}>
            Upgrade your plan to manage multiple businesses with separate observatories.
          </p>
          <button
            onClick={() => router.push('/observatory/billing')}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: "#fff",
              color: "#92400e",
              border: "2px solid #fbbf24",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            View Pricing Plans
          </button>
        </div>
      </div>
    </main>
  );
}
