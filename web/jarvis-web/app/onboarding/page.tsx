"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

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

  const userName = session.user?.name?.split(" ")[0] || "there";

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = () => {
    router.push("/observatory");
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
        <button
          onClick={handleFinish}
          style={{
            background: "transparent",
            border: "none",
            color: "#6b7280",
            fontSize: 14,
            cursor: "pointer",
            padding: "8px 16px",
          }}
        >
          Skip to Observatory →
        </button>
      </header>

      {/* Progress Indicator */}
      <div style={{
        padding: "24px 40px",
        background: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
      }}>
        <div style={{
          maxWidth: 800,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}>
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: 1,
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: step <= currentStep
                  ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                  : "#e5e7eb",
                color: step <= currentStep ? "#fff" : "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
              }}>
                {step}
              </div>
              {step < 3 && (
                <div style={{
                  flex: 1,
                  height: 2,
                  background: step < currentStep ? "#ef4444" : "#e5e7eb",
                  marginLeft: 8,
                }} />
              )}
            </div>
          ))}
        </div>
        <div style={{
          maxWidth: 800,
          margin: "0 auto",
          fontSize: 14,
          color: "#6b7280",
          textAlign: "center",
        }}>
          Step {currentStep} of {totalSteps}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}>
        <div style={{
          maxWidth: 700,
          width: "100%",
        }}>
          {currentStep === 1 && <StepWelcome userName={userName} onNext={handleNext} />}
          {currentStep === 2 && <StepConnectAccounts onNext={handleNext} onSkip={handleSkip} />}
          {currentStep === 3 && <StepComplete onFinish={handleFinish} />}
        </div>
      </div>
    </main>
  );
}

// Step 1: Welcome Screen
function StepWelcome({ userName, onNext }: { userName: string; onNext: () => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: 72,
        marginBottom: 24,
      }}>
        🚀
      </div>
      <h1 style={{
        fontSize: 48,
        fontWeight: 800,
        marginBottom: 16,
        color: "#111827",
      }}>
        Welcome to Jarvis AI, {userName}!
      </h1>
      <p style={{
        fontSize: 20,
        color: "#6b7280",
        marginBottom: 32,
        lineHeight: 1.6,
      }}>
        Your personal AI Chief of Staff is ready to automate your business operations 24/7.
        Let's get you set up in just a few quick steps.
      </p>
      <div style={{
        background: "#fef2f2",
        border: "1px solid #fee2e2",
        borderRadius: 12,
        padding: 32,
        marginBottom: 40,
        textAlign: "left",
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#dc2626",
          marginBottom: 16,
        }}>
          What Jarvis Can Do For You:
        </h3>
        <ul style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}>
          <ListItem icon="💬" text="Automatically respond to iMessages, emails, and DMs" />
          <ListItem icon="🐦" text="Manage and post to your social media accounts" />
          <ListItem icon="📊" text="Integrate with Salesforce, HubSpot, and other business tools" />
          <ListItem icon="📈" text="Automate sales, marketing, and customer service" />
          <ListItem icon="⚡" text="Work 24/7 while you focus on growing your business" />
        </ul>
      </div>
      <button
        onClick={onNext}
        style={{
          padding: "16px 48px",
          borderRadius: 10,
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          fontWeight: 600,
          boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
        }}
      >
        Get Started →
      </button>
    </div>
  );
}

// Step 2: Connect Accounts
function StepConnectAccounts({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div>
      <div style={{
        textAlign: "center",
        marginBottom: 40,
      }}>
        <div style={{
          fontSize: 64,
          marginBottom: 24,
        }}>
          🔌
        </div>
        <h2 style={{
          fontSize: 40,
          fontWeight: 800,
          marginBottom: 16,
          color: "#111827",
        }}>
          Connect Your Accounts
        </h2>
        <p style={{
          fontSize: 18,
          color: "#6b7280",
          lineHeight: 1.6,
        }}>
          Link your business tools so Jarvis can start automating
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 16,
        marginBottom: 32,
      }}>
        <IntegrationCard
          icon="💬"
          title="iMessage"
          description="Auto-respond to text messages"
        />
        <IntegrationCard
          icon="📧"
          title="Email"
          description="Gmail and Outlook integration"
        />
        <IntegrationCard
          icon="🐦"
          title="Social Media"
          description="Twitter/X, Instagram, LinkedIn"
        />
        <IntegrationCard
          icon="🔷"
          title="Salesforce"
          description="CRM and sales automation"
        />
        <IntegrationCard
          icon="🟠"
          title="HubSpot"
          description="Marketing and sales platform"
        />
        <IntegrationCard
          icon="📱"
          title="SMS"
          description="Text message automation"
        />
      </div>

      <div style={{
        background: "#fef2f2",
        border: "1px solid #fee2e2",
        borderRadius: 12,
        padding: 20,
        marginBottom: 32,
        textAlign: "center",
      }}>
        <p style={{
          fontSize: 14,
          color: "#dc2626",
          margin: 0,
          fontWeight: 500,
        }}>
          Don't worry! You can connect these accounts anytime from your Observatory.
        </p>
      </div>

      <div style={{
        display: "flex",
        gap: 16,
        justifyContent: "center",
      }}>
        <button
          onClick={onSkip}
          style={{
            padding: "14px 32px",
            borderRadius: 8,
            background: "#fff",
            color: "#6b7280",
            border: "2px solid #e5e7eb",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Skip for Now
        </button>
        <button
          onClick={onNext}
          style={{
            padding: "14px 32px",
            borderRadius: 8,
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// Step 4: Complete
function StepComplete({ onFinish }: { onFinish: () => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: 72,
        marginBottom: 24,
      }}>
        🎉
      </div>
      <h2 style={{
        fontSize: 48,
        fontWeight: 800,
        marginBottom: 16,
        color: "#111827",
      }}>
        All Done!
      </h2>
      <p style={{
        fontSize: 20,
        color: "#6b7280",
        marginBottom: 40,
        lineHeight: 1.6,
      }}>
        Your Observatory is ready. Let's start automating your business!
      </p>

      <div style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 32,
        marginBottom: 40,
        textAlign: "left",
      }}>
        <h3 style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 20,
        }}>
          What's Next?
        </h3>
        <ul style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}>
          <ListItem
            icon="🔭"
            text="Explore your Observatory dashboard"
          />
          <ListItem
            icon="🔗"
            text="Connect your business accounts to enable automation"
          />
          <ListItem
            icon="⚙️"
            text="Customize your AI assistant's behavior and preferences"
          />
          <ListItem
            icon="📊"
            text="Monitor your automated tasks and analytics in real-time"
          />
          <ListItem
            icon="💡"
            text="Check out the help center to learn advanced features"
          />
        </ul>
      </div>

      <button
        onClick={onFinish}
        style={{
          padding: "18px 48px",
          borderRadius: 10,
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          fontWeight: 600,
          boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
        }}
      >
        Go to Your Observatory 🚀
      </button>
    </div>
  );
}

// Integration Card Component
function IntegrationCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: "#fff",
        border: isHovered ? "2px solid #ef4444" : "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: isHovered ? "0 4px 12px rgba(239,68,68,0.1)" : "none",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <h4 style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 8,
      }}>
        {title}
      </h4>
      <p style={{
        fontSize: 14,
        color: "#6b7280",
        marginBottom: 16,
        lineHeight: 1.5,
      }}>
        {description}
      </p>
      <div style={{
        display: "flex",
        gap: 8,
      }}>
        <button
          style={{
            flex: 1,
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
          Connect
        </button>
        <button
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            background: "#f9fafb",
            color: "#6b7280",
            border: "1px solid #e5e7eb",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// List Item Component
function ListItem({ icon, text }: { icon: string; text: string }) {
  return (
    <li style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 12,
      fontSize: 15,
      color: "#374151",
      lineHeight: 1.6,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <span>{text}</span>
    </li>
  );
}
