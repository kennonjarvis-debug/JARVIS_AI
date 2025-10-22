"use client";

import { signIn } from "next-auth/react";

export const dynamic = 'force-dynamic';

export default function LandingPage() {

  return (
    <main style={{
      minHeight: "100vh",
      background: "#ffffff",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
    }}>
      {/* Navigation Header */}
      <header style={{
        padding: "20px 60px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #e5e7eb",
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
            🤖
          </div>
          <strong style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Jarvis AI</strong>
        </div>

        <nav style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}>
          <a href="#features" style={{ color: "#6b7280", textDecoration: "none", fontSize: 15, cursor: "pointer" }}>Features</a>
          <a href="#pricing" style={{ color: "#6b7280", textDecoration: "none", fontSize: 15, cursor: "pointer" }}>Pricing</a>
          <a href="#how-it-works" style={{ color: "#6b7280", textDecoration: "none", fontSize: 15, cursor: "pointer" }}>How It Works</a>
          <button
            onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
            style={{
              background: "transparent",
              border: "none",
              color: "#6b7280",
              fontSize: 15,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Login
          </button>
          <button
            onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(239,68,68,0.3)",
            }}
          >
            Start Free
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "80px 60px",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "#fef2f2",
          padding: "8px 16px",
          borderRadius: 20,
          marginBottom: 32,
          border: "1px solid #fee2e2",
        }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <span style={{ color: "#dc2626", fontSize: 14, fontWeight: 600 }}>Your AI Chief of Staff</span>
        </div>

        <h1 style={{
          fontSize: 72,
          fontWeight: 800,
          marginBottom: 24,
          lineHeight: 1.1,
          color: "#111827",
        }}>
          Work Less.
          <br />
          <span style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>Scale More.</span>
        </h1>

        <p style={{
          fontSize: 20,
          color: "#6b7280",
          marginBottom: 40,
          maxWidth: 700,
          margin: "0 auto 40px",
          lineHeight: 1.6,
        }}>
          Jarvis automates your business operations 24/7. From iMessages to social media, let AI handle the routine while you focus on growth.
        </p>

        <div style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          marginBottom: 20,
        }}>
          <button
            onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
            style={{
              padding: "16px 32px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Start Free Trial
            <span>→</span>
          </button>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: "16px 32px",
              borderRadius: 10,
              background: "#fff",
              color: "#6b7280",
              border: "2px solid #e5e7eb",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            See How It Works
          </button>
        </div>

        <p style={{
          fontSize: 14,
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}>
          <span>✨ No credit card required</span>
          <span>•</span>
          <span>14-day free trial</span>
          <span>•</span>
          <span>Cancel anytime</span>
        </p>
      </section>

      {/* Stats Section */}
      <section style={{
        background: "#f9fafb",
        padding: "80px 60px",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 60,
          textAlign: "center",
        }}>
          <div>
            <div style={{
              fontSize: 64,
              fontWeight: 800,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 12,
            }}>16 hrs</div>
            <div style={{ fontSize: 18, color: "#6b7280", fontWeight: 500 }}>Saved per week</div>
          </div>
          <div>
            <div style={{
              fontSize: 64,
              fontWeight: 800,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 12,
            }}>90%</div>
            <div style={{ fontSize: 18, color: "#6b7280", fontWeight: 500 }}>Tasks automated</div>
          </div>
          <div>
            <div style={{
              fontSize: 64,
              fontWeight: 800,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 12,
            }}>24/7</div>
            <div style={{ fontSize: 18, color: "#6b7280", fontWeight: 500 }}>Always working</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: "100px 60px",
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
            Everything you need to scale
          </h2>
          <p style={{
            fontSize: 20,
            color: "#6b7280",
            maxWidth: 600,
            margin: "0 auto",
          }}>
            Jarvis handles the busywork so you can focus on what matters most
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: 32,
        }}>
          <FeatureCard
            icon="💬"
            title="iMessage Automation"
            description="Respond to customer inquiries automatically, 24/7"
          />
          <FeatureCard
            icon="🐦"
            title="Social Media"
            description="Auto-post content and engage with your audience"
          />
          <FeatureCard
            icon="📧"
            title="Email Management"
            description="Smart email filtering and automated responses"
          />
          <FeatureCard
            icon="📊"
            title="Business Analytics"
            description="Track performance and get actionable insights"
          />
          <FeatureCard
            icon="🎵"
            title="DAWG AI Integration"
            description="AI-powered music production and creative tools"
          />
          <FeatureCard
            icon="🔒"
            title="Secure & Private"
            description="Enterprise-grade security for your business data"
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{
        background: "#f9fafb",
        padding: "100px 60px",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          textAlign: "center",
        }}>
          <h2 style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#111827",
            marginBottom: 16,
          }}>
            Get started in minutes
          </h2>
          <p style={{
            fontSize: 20,
            color: "#6b7280",
            maxWidth: 600,
            margin: "0 auto 60px",
          }}>
            Connect your business and let Jarvis do the rest
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 40,
            textAlign: "left",
          }}>
            <StepCard
              number="1"
              title="Sign up with Google"
              description="Create your Observatory in seconds with Google OAuth"
            />
            <StepCard
              number="2"
              title="Connect your accounts"
              description="Link iMessage, Twitter, email, and other services"
            />
            <StepCard
              number="3"
              title="Let AI work"
              description="Jarvis automatically handles tasks 24/7 while you focus on growth"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{
        padding: "100px 60px",
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
            Simple, transparent pricing
          </h2>
          <p style={{
            fontSize: 20,
            color: "#6b7280",
            maxWidth: 600,
            margin: "0 auto",
          }}>
            Choose the plan that fits your business. All plans include a 14-day free trial.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 32,
          alignItems: "stretch",
        }}>
          <PricingCard
            name="Starter"
            price="$49"
            period="per month"
            description="Perfect for solopreneurs and small businesses getting started with automation"
            features={[
              "Up to 1,000 automated actions/month",
              "iMessage automation",
              "Basic email management",
              "Social media scheduling (1 account)",
              "Basic analytics dashboard",
              "Email support",
              "14-day free trial"
            ]}
            popular={false}
          />
          <PricingCard
            name="Professional"
            price="$149"
            period="per month"
            description="For growing businesses that need advanced automation and integrations"
            features={[
              "Up to 10,000 automated actions/month",
              "Advanced iMessage automation",
              "Smart email management with AI",
              "Social media scheduling (5 accounts)",
              "Twitter/X auto-engagement",
              "Advanced analytics & reporting",
              "DAWG AI integration",
              "Priority support",
              "Custom workflows",
              "API access"
            ]}
            popular={true}
          />
          <PricingCard
            name="Enterprise"
            price="Custom"
            period="contact us"
            description="For large organizations requiring unlimited scale and dedicated support"
            features={[
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
            ]}
            popular={false}
          />
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

      {/* CTA Section */}
      <section style={{
        padding: "100px 60px",
        textAlign: "center",
      }}>
        <div style={{
          maxWidth: 800,
          margin: "0 auto",
        }}>
          <h2 style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#111827",
            marginBottom: 24,
          }}>
            Ready to work less and scale more?
          </h2>
          <p style={{
            fontSize: 20,
            color: "#6b7280",
            marginBottom: 40,
          }}>
            Join businesses already automating with Jarvis AI
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
            style={{
              padding: "18px 40px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 600,
              boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
            }}
          >
            Start Your Free Trial →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #e5e7eb",
        padding: "40px 60px",
        background: "#fff",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#6b7280",
          fontSize: 14,
        }}>
          <div>© 2025 Jarvis AI. All rights reserved.</div>
          <div style={{ display: "flex", gap: 32 }}>
            <a href="#" style={{ color: "#6b7280", textDecoration: "none" }}>Privacy</a>
            <a href="#" style={{ color: "#6b7280", textDecoration: "none" }}>Terms</a>
            <a href="#" style={{ color: "#6b7280", textDecoration: "none" }}>Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{
      background: "#fff",
      padding: 32,
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      transition: "all 0.3s",
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <h3 style={{
        fontSize: 20,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 12,
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: 15,
        color: "#6b7280",
        lineHeight: 1.6,
      }}>
        {description}
      </p>
    </div>
  );
}

function StepCard({ number, title, description }: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{
      background: "#fff",
      padding: 32,
      borderRadius: 16,
      border: "1px solid #e5e7eb",
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        fontWeight: 800,
        marginBottom: 20,
      }}>
        {number}
      </div>
      <h3 style={{
        fontSize: 20,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 12,
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: 15,
        color: "#6b7280",
        lineHeight: 1.6,
      }}>
        {description}
      </p>
    </div>
  );
}

function PricingCard({ name, price, period, description, features, popular }: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
}) {
  return (
    <div style={{
      background: "#fff",
      padding: 40,
      borderRadius: 16,
      border: popular ? "2px solid #ef4444" : "1px solid #e5e7eb",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      boxShadow: popular ? "0 8px 24px rgba(239,68,68,0.15)" : "none",
    }}>
      {popular && (
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

      <div style={{ marginBottom: 24 }}>
        <h3 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 8,
        }}>
          {name}
        </h3>
        <p style={{
          fontSize: 14,
          color: "#6b7280",
          lineHeight: 1.5,
          minHeight: 42,
        }}>
          {description}
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
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
            {price}
          </span>
          <span style={{
            fontSize: 16,
            color: "#6b7280",
          }}>
            /{period}
          </span>
        </div>
      </div>

      <ul style={{
        listStyle: "none",
        padding: 0,
        margin: "0 0 32px 0",
        flex: 1,
      }}>
        {features.map((feature, index) => (
          <li key={index} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 16,
            fontSize: 15,
            color: "#374151",
            lineHeight: 1.5,
          }}>
            <span style={{
              color: "#ef4444",
              fontSize: 18,
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
        onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
        style={{
          width: "100%",
          padding: "16px 24px",
          borderRadius: 10,
          background: popular
            ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            : "#fff",
          color: popular ? "#fff" : "#374151",
          border: popular ? "none" : "2px solid #e5e7eb",
          cursor: "pointer",
          fontSize: 16,
          fontWeight: 600,
          boxShadow: popular ? "0 4px 12px rgba(239,68,68,0.3)" : "none",
          transition: "all 0.2s",
        }}
      >
        Start Free Trial
      </button>
    </div>
  );
}
