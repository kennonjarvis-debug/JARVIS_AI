"use client";

import { signIn } from "next-auth/react";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        maxWidth: 480,
        width: "100%",
        background: "#fff",
        borderRadius: 24,
        padding: "48px 40px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
        border: "1px solid #f3f4f6",
      }}>
        {/* Logo and Header */}
        <div style={{
          textAlign: "center",
          marginBottom: 40,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 16,
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              boxShadow: "0 8px 24px rgba(239,68,68,0.3)",
            }}>
              🤖
            </div>
            <strong style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#111827"
            }}>
              Jarvis AI
            </strong>
          </div>

          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#fef2f2",
            padding: "8px 16px",
            borderRadius: 20,
            marginBottom: 12,
            border: "1px solid #fee2e2",
          }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <span style={{
              color: "#dc2626",
              fontSize: 14,
              fontWeight: 600
            }}>
              Your AI Chief of Staff
            </span>
          </div>

          <h1 style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#111827",
            marginBottom: 12,
            lineHeight: 1.2,
          }}>
            Welcome Back
          </h1>

          <p style={{
            fontSize: 16,
            color: "#6b7280",
            lineHeight: 1.5,
            margin: 0,
          }}>
            Sign in to continue automating your business operations 24/7
          </p>
        </div>

        {/* Sign In Button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 12,
            background: "#fff",
            color: "#374151",
            border: "2px solid #e5e7eb",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            transition: "all 0.2s",
            marginBottom: 24,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#d1d5db";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e5e7eb";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          <span style={{ fontSize: 14, color: "#9ca3af" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        </div>

        {/* Sign Up Button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
            transition: "all 0.2s",
            marginBottom: 32,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(239,68,68,0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(239,68,68,0.3)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Create New Account
        </button>

        {/* Benefits Section */}
        <div style={{
          padding: "24px 0",
          borderTop: "1px solid #f3f4f6",
        }}>
          <div style={{
            fontSize: 13,
            color: "#6b7280",
            textAlign: "center",
            marginBottom: 16,
            fontWeight: 600,
          }}>
            What you'll get:
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            <BenefitItem
              icon="✨"
              text="14-day free trial, no credit card required"
            />
            <BenefitItem
              icon="🤖"
              text="AI-powered business automation 24/7"
            />
            <BenefitItem
              icon="🔒"
              text="Enterprise-grade security & privacy"
            />
            <BenefitItem
              icon="⚡"
              text="Save 16+ hours per week on tasks"
            />
          </div>
        </div>

        {/* Footer */}
        <p style={{
          fontSize: 12,
          color: "#9ca3af",
          textAlign: "center",
          lineHeight: 1.6,
          marginTop: 24,
          marginBottom: 0,
        }}>
          By signing in, you agree to our{" "}
          <a href="#" style={{ color: "#dc2626", textDecoration: "none" }}>
            Terms of Service
          </a>
          {" "}and{" "}
          <a href="#" style={{ color: "#dc2626", textDecoration: "none" }}>
            Privacy Policy
          </a>
        </p>
      </div>
    </main>
  );
}

function BenefitItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 14,
      color: "#374151",
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
