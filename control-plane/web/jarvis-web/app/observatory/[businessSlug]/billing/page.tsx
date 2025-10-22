"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import BusinessCheckout from "@/components/BusinessCheckout";

export const dynamic = 'force-dynamic';

interface Business {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  subscriptionStatus?: string;
  trialEndsAt?: string;
}

export default function BusinessBillingPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const businessSlug = params?.businessSlug as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated" && businessSlug) {
      fetchBusiness();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, businessSlug]);

  const fetchBusiness = async () => {
    try {
      const response = await fetch("/api/businesses");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch businesses");
      }

      // Find the business by slug
      const foundBusiness = data.businesses.find(
        (b: Business) => b.slug === businessSlug
      );

      if (!foundBusiness) {
        setError("Business not found or access denied");
        return;
      }

      setBusiness(foundBusiness);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}>
        <div style={{ color: "#111827", fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        padding: 40,
      }}>
        <div style={{
          maxWidth: 500,
          textAlign: "center",
        }}>
          <div style={{
            fontSize: 72,
            marginBottom: 24,
          }}>
            ⚠️
          </div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 16,
          }}>
            Error
          </h1>
          <p style={{
            fontSize: 16,
            color: "#6b7280",
            marginBottom: 32,
          }}>
            {error}
          </p>
          <button
            onClick={() => router.push("/observatory")}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f9fafb",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
    }}>
      {/* Header */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "20px 40px",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}>
          <button
            onClick={() => router.push(`/observatory/${businessSlug}`)}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: 24,
              padding: 8,
              display: "flex",
              alignItems: "center",
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}>
              Billing & Subscription
            </h1>
            <p style={{
              fontSize: 14,
              color: "#6b7280",
              margin: 0,
              marginTop: 4,
            }}>
              Manage your subscription and billing settings
            </p>
          </div>
        </div>
      </header>

      {/* Trial Banner */}
      {business.subscriptionStatus === "trialing" && business.trialEndsAt && (
        <div style={{
          background: "#fef2f2",
          borderBottom: "1px solid #fee2e2",
          padding: "16px 40px",
        }}>
          <div style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>🎉</span>
            <div>
              <strong style={{ color: "#dc2626", fontSize: 14, fontWeight: 600 }}>
                Free Trial Active
              </strong>
              <p style={{
                fontSize: 14,
                color: "#6b7280",
                margin: 0,
                marginTop: 4,
              }}>
                Your trial ends on{" "}
                {new Date(business.trialEndsAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                . Choose a plan to continue using Jarvis AI.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{
        padding: "40px 20px",
      }}>
        <BusinessCheckout
          businessId={business.id}
          businessName={business.name}
          currentPlanTier={business.planTier}
        />
      </div>
    </main>
  );
}
