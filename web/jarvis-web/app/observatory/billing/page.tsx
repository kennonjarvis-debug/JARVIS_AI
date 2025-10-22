"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  observatories: number | string;
  description: string;
  features: string[];
  popular: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    period: "month",
    observatories: "1 observatory",
    description: "Perfect for individual business owners getting started",
    features: [
      "1 business observatory",
      "Up to 1,000 automated actions/month",
      "iMessage automation",
      "Basic email management",
      "Social media scheduling (1 account)",
      "Basic analytics dashboard",
      "Email support",
      "14-day free trial"
    ],
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: 99,
    period: "month",
    observatories: "5 observatories",
    description: "For entrepreneurs managing multiple businesses",
    features: [
      "Up to 5 business observatories",
      "Up to 10,000 automated actions/month",
      "Advanced iMessage automation",
      "Smart email management with AI",
      "Social media scheduling (5 accounts per observatory)",
      "Twitter/X auto-engagement",
      "Advanced analytics & reporting",
      "DAWG AI integration",
      "Priority support",
      "Custom workflows",
      "API access"
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    period: "month",
    observatories: "Unlimited observatories",
    description: "For large organizations with unlimited scale",
    features: [
      "Unlimited business observatories",
      "Unlimited automated actions",
      "All Professional features",
      "Unlimited social media accounts",
      "White-label options",
      "Custom AI model training",
      "Dedicated account manager",
      "24/7 phone support",
      "SLA guarantee",
      "Custom integrations",
      "On-premise deployment option"
    ],
    popular: false,
  }
];

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlan] = useState<string>("starter"); // Mock current plan
  const [observatoriesUsed] = useState<number>(1); // Mock observatories used

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
        <div>Loading Billing...</div>
      </div>
    );
  }

  if (!session) return null;

  const handleSubscribe = async (planId: string) => {
    setIsProcessing(true);
    setSelectedPlan(planId);

    try {
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          email: session.user?.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // In a real implementation, redirect to payment gateway
        alert(`Subscription to ${planId} plan initiated! (Mock)`);
        router.push('/observatory');
      } else {
        alert('Failed to process subscription. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const currentTier = pricingTiers.find(tier => tier.id === currentPlan);

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
            💳
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Billing & Subscription</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Manage your plan and observatories</div>
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
            Back to Observatory
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

      {/* Current Plan Banner */}
      <section style={{
        background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
        borderBottom: "1px solid #fecaca",
        padding: "32px 60px",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <h2 style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 8,
            }}>
              Current Plan: {currentTier?.name}
            </h2>
            <p style={{
              fontSize: 16,
              color: "#6b7280",
              marginBottom: 8,
            }}>
              {currentTier?.description}
            </p>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              fontSize: 14,
              color: "#6b7280",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>🔭</span>
                <span>
                  <strong style={{ color: "#111827" }}>{observatoriesUsed}</strong> of{" "}
                  {typeof currentTier?.observatories === 'string'
                    ? currentTier.observatories
                    : `${currentTier?.observatories} observatories`} used
                </span>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>💰</span>
                <span>
                  <strong style={{ color: "#111827" }}>${currentTier?.price}</strong>/month
                </span>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>📅</span>
                <span>Next billing: <strong style={{ color: "#111827" }}>Nov 17, 2025</strong></span>
              </div>
            </div>
          </div>
          <div style={{
            padding: "12px 24px",
            borderRadius: 8,
            background: "#fff",
            border: "2px solid #dc2626",
            fontSize: 14,
            fontWeight: 600,
            color: "#dc2626",
          }}>
            Active
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section style={{
        padding: "80px 60px",
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#111827",
            marginBottom: 16,
          }}>
            Choose Your Plan
          </h2>
          <p style={{
            fontSize: 20,
            color: "#6b7280",
            maxWidth: 600,
            margin: "0 auto",
          }}>
            Scale your business with multiple observatories. Upgrade or downgrade anytime.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 32,
          alignItems: "stretch",
        }}>
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              style={{
                background: "#fff",
                padding: 40,
                borderRadius: 16,
                border: tier.popular ? "2px solid #ef4444" : "1px solid #e5e7eb",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                boxShadow: tier.popular ? "0 8px 24px rgba(239,68,68,0.15)" : "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              {tier.popular && (
                <div style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#fff",
                  padding: "6px 20px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  Most Popular
                </div>
              )}

              {tier.id === currentPlan && (
                <div style={{
                  position: "absolute",
                  top: tier.popular ? 20 : -12,
                  right: -12,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#fff",
                  padding: "6px 16px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}>
                  Current Plan
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <h3 style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 8,
                }}>
                  {tier.name}
                </h3>
                <p style={{
                  fontSize: 14,
                  color: "#6b7280",
                  lineHeight: 1.5,
                  minHeight: 42,
                }}>
                  {tier.description}
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                }}>
                  <span style={{
                    fontSize: 48,
                    fontWeight: 800,
                    color: "#111827",
                  }}>
                    ${tier.price}
                  </span>
                  <span style={{
                    fontSize: 16,
                    color: "#6b7280",
                  }}>
                    /{tier.period}
                  </span>
                </div>
                <div style={{
                  fontSize: 14,
                  color: "#ef4444",
                  fontWeight: 600,
                  marginTop: 8,
                }}>
                  {tier.observatories}
                </div>
              </div>

              <ul style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 32px 0",
                flex: 1,
              }}>
                {tier.features.map((feature, index) => (
                  <li key={index} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 12,
                    fontSize: 14,
                    color: "#374151",
                    lineHeight: 1.5,
                  }}>
                    <span style={{
                      color: "#ef4444",
                      fontSize: 16,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.id)}
                disabled={tier.id === currentPlan || isProcessing}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 10,
                  background: tier.id === currentPlan
                    ? "#e5e7eb"
                    : tier.popular
                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    : "#fff",
                  color: tier.id === currentPlan
                    ? "#9ca3af"
                    : tier.popular
                    ? "#fff"
                    : "#374151",
                  border: tier.id === currentPlan || tier.popular ? "none" : "2px solid #e5e7eb",
                  cursor: tier.id === currentPlan ? "not-allowed" : "pointer",
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: tier.popular && tier.id !== currentPlan ? "0 4px 12px rgba(239,68,68,0.3)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {isProcessing && selectedPlan === tier.id
                  ? "Processing..."
                  : tier.id === currentPlan
                  ? "Current Plan"
                  : "Upgrade to " + tier.name}
              </button>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: "center",
          marginTop: 48,
          padding: "24px",
          background: "#fef2f2",
          borderRadius: 12,
          border: "1px solid #fee2e2",
        }}>
          <p style={{
            fontSize: 16,
            color: "#6b7280",
            margin: 0,
          }}>
            <strong style={{ color: "#dc2626" }}>All plans include:</strong> 256-bit encryption, GDPR compliance, automated backups, and cancel anytime
          </p>
        </div>
      </section>

      {/* Payment History */}
      <section style={{
        padding: "60px 60px 100px",
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        <h2 style={{
          fontSize: 32,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 24,
        }}>
          Payment History
        </h2>

        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
          }}>
            <thead>
              <tr style={{
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
              }}>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#6b7280",
                }}>Date</th>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#6b7280",
                }}>Description</th>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#6b7280",
                }}>Amount</th>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#6b7280",
                }}>Status</th>
                <th style={{
                  padding: "16px 24px",
                  textAlign: "right",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#6b7280",
                }}>Invoice</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{
                  padding: "16px 24px",
                  fontSize: 14,
                  color: "#111827",
                }}>Oct 17, 2025</td>
                <td style={{
                  padding: "16px 24px",
                  fontSize: 14,
                  color: "#111827",
                }}>Starter Plan - Monthly</td>
                <td style={{
                  padding: "16px 24px",
                  fontSize: 14,
                  color: "#111827",
                  fontWeight: 600,
                }}>$29.00</td>
                <td style={{
                  padding: "16px 24px",
                }}>
                  <span style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 12,
                    background: "#d1fae5",
                    color: "#065f46",
                    fontSize: 12,
                    fontWeight: 600,
                  }}>Paid</span>
                </td>
                <td style={{
                  padding: "16px 24px",
                  textAlign: "right",
                }}>
                  <button style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}>
                    Download
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
