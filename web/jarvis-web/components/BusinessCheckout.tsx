"use client";

import React, { useState } from "react";

interface BusinessCheckoutProps {
  businessId: string;
  businessName: string;
  currentPlanTier?: string;
}

interface Plan {
  id: "starter" | "professional" | "enterprise";
  name: string;
  price: number;
  billingPeriod: string;
  features: string[];
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    billingPeriod: "per month",
    features: [
      "Up to 5 team members",
      "Basic AI automations",
      "Email & chat support",
      "50 AI requests per day",
      "Standard integrations",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 149,
    billingPeriod: "per month",
    recommended: true,
    features: [
      "Unlimited team members",
      "Advanced AI automations",
      "Priority support",
      "500 AI requests per day",
      "All integrations",
      "Custom workflows",
      "Analytics dashboard",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    billingPeriod: "per month",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "24/7 phone support",
      "Unlimited AI requests",
      "Custom integrations",
      "SLA guarantee",
      "Advanced security",
      "On-premise deployment",
    ],
  },
];

export default function BusinessCheckout({
  businessId,
  businessName,
  currentPlanTier = "FREE",
}: BusinessCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async (planTier: "starter" | "professional" | "enterprise") => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/billing/create-business-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
          planTier,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 1200,
      margin: "0 auto",
      padding: 40,
    }}>
      {/* Header */}
      <div style={{
        textAlign: "center",
        marginBottom: 48,
      }}>
        <h1 style={{
          fontSize: 40,
          fontWeight: 800,
          color: "#111827",
          marginBottom: 16,
        }}>
          Choose a Plan for {businessName}
        </h1>
        <p style={{
          fontSize: 18,
          color: "#6b7280",
          lineHeight: 1.6,
        }}>
          Upgrade your business to unlock more features and capabilities
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 12,
          padding: 16,
          marginBottom: 32,
          color: "#dc2626",
          fontSize: 14,
          textAlign: "center",
        }}>
          {error}
        </div>
      )}

      {/* Pricing Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 24,
        marginBottom: 48,
      }}>
        {PLANS.map((plan) => {
          const isCurrent = currentPlanTier.toUpperCase() === plan.id.toUpperCase();

          return (
            <div
              key={plan.id}
              style={{
                position: "relative",
                background: "#fff",
                border: plan.recommended ? "2px solid #ef4444" : "1px solid #e5e7eb",
                borderRadius: 16,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                boxShadow: plan.recommended ? "0 10px 30px rgba(239,68,68,0.1)" : "none",
              }}
            >
              {/* Recommended Badge */}
              {plan.recommended && (
                <div style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "6px 16px",
                  borderRadius: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Recommended
                </div>
              )}

              {/* Plan Name */}
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 8,
              }}>
                {plan.name}
              </div>

              {/* Price */}
              <div style={{
                marginBottom: 24,
              }}>
                <span style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: "#111827",
                }}>
                  ${plan.price}
                </span>
                <span style={{
                  fontSize: 16,
                  color: "#6b7280",
                  marginLeft: 8,
                }}>
                  {plan.billingPeriod}
                </span>
              </div>

              {/* Features */}
              <ul style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                marginBottom: 32,
                flex: 1,
              }}>
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      marginBottom: 12,
                      fontSize: 14,
                      color: "#374151",
                      lineHeight: 1.6,
                    }}
                  >
                    <svg
                      style={{
                        width: 20,
                        height: 20,
                        color: "#ef4444",
                        flexShrink: 0,
                      }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading || isCurrent}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 8,
                  background: isCurrent
                    ? "#f9fafb"
                    : plan.recommended
                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    : "#fff",
                  color: isCurrent
                    ? "#6b7280"
                    : plan.recommended
                    ? "#fff"
                    : "#111827",
                  border: isCurrent
                    ? "1px solid #e5e7eb"
                    : plan.recommended
                    ? "none"
                    : "1px solid #e5e7eb",
                  cursor: loading || isCurrent ? "not-allowed" : "pointer",
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: plan.recommended && !isCurrent ? "0 4px 12px rgba(239,68,68,0.3)" : "none",
                  transition: "all 0.2s",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (!loading && !isCurrent) {
                    if (plan.recommended) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(239,68,68,0.4)";
                    } else {
                      e.currentTarget.style.background = "#f9fafb";
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && !isCurrent) {
                    if (plan.recommended) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(239,68,68,0.3)";
                    } else {
                      e.currentTarget.style.background = "#fff";
                    }
                  }
                }}
              >
                {isCurrent
                  ? "Current Plan"
                  : loading
                  ? "Processing..."
                  : "Subscribe"}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 32,
      }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 24,
        }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: "grid", gap: 20 }}>
          <FAQItem
            question="Can I change plans later?"
            answer="Yes! You can upgrade or downgrade your plan at any time from the billing settings. Changes will be prorated automatically."
          />
          <FAQItem
            question="What payment methods do you accept?"
            answer="We accept all major credit cards (Visa, Mastercard, American Express) through Stripe's secure payment processing."
          />
          <FAQItem
            question="Is there a free trial?"
            answer="All new businesses get a 7-day free trial. You won't be charged until the trial period ends."
          />
          <FAQItem
            question="Can I cancel anytime?"
            answer="Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
          />
        </div>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        color: "#111827",
        marginBottom: 8,
      }}>
        {question}
      </h3>
      <p style={{
        fontSize: 14,
        color: "#6b7280",
        lineHeight: 1.6,
        margin: 0,
      }}>
        {answer}
      </p>
    </div>
  );
}
