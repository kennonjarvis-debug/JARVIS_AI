"use client";

import React from "react";
import { signIn } from "next-auth/react";

export default function LandingPage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#fff",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
    }}>
      {/* Header */}
      <header style={{
        padding: "20px 40px",
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
            borderRadius: 10,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}>
            🤖
          </div>
          <strong style={{ fontSize: 24, fontWeight: 700 }}>Jarvis AI</strong>
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/observatory" })}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            background: "#fff",
            color: "#667eea",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          Login
        </button>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "100px 40px",
        textAlign: "center",
      }}>
        <h1 style={{
          fontSize: 64,
          fontWeight: 700,
          marginBottom: 20,
          lineHeight: 1.2,
        }}>
          Work Less.<br/>
          <span style={{ color: "#ffd700" }}>Scale More.</span>
        </h1>

        <p style={{
          fontSize: 24,
          opacity: 0.95,
          marginBottom: 40,
          maxWidth: 800,
          margin: "0 auto 40px",
          lineHeight: 1.6,
        }}>
          Jarvis automates your business operations 24/7. From iMessages to social media, let AI handle the routine while you focus on growth.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/observatory" })}
          style={{
            padding: "18px 40px",
            borderRadius: 10,
            background: "#fff",
            color: "#667eea",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            fontWeight: 600,
            boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
            marginBottom: 20,
          }}
        >
          Sign in with Google →
        </button>

        <p style={{
          fontSize: 14,
          opacity: 0.8,
        }}>
          ✨ No credit card required • 14-day free trial • Cancel anytime
        </p>
      </section>

      {/* Stats Section */}
      <section style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "60px 40px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 40,
        textAlign: "center",
      }}>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#ffd700" }}>16 hrs</div>
          <div style={{ fontSize: 18, opacity: 0.9 }}>Saved per week</div>
        </div>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#ffd700" }}>90%</div>
          <div style={{ fontSize: 18, opacity: 0.9 }}>Tasks automated</div>
        </div>
        <div>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#ffd700" }}>24/7</div>
          <div style={{ fontSize: 18, opacity: 0.9 }}>Always working</div>
        </div>
      </section>
    </main>
  );
}
