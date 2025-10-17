"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          text: "Hi! I'm Jarvis Support. I can help you with subscriptions, account management, and any questions about using Jarvis AI. How can I help you today?",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("subscribe") || lowerMessage.includes("subscription")) {
      return "To subscribe to Jarvis AI:\n\n1. Sign up with your Google account\n2. Complete the onboarding process to create your Observatory\n3. Choose your plan (Starter, Professional, or Enterprise)\n4. Enter your payment details\n\nAll plans include a 14-day free trial with no credit card required upfront. You can cancel anytime!";
    }

    if (lowerMessage.includes("delete") && lowerMessage.includes("account")) {
      return "To delete your account:\n\n1. Sign in to your Observatory dashboard\n2. Navigate to Settings > Account Settings\n3. Scroll down to the 'Danger Zone' section\n4. Click 'Delete Account'\n5. Confirm deletion by entering your email address\n\nNote: Account deletion is permanent and all your data will be removed within 30 days.";
    }

    if (lowerMessage.includes("refund")) {
      return "We have a strict no-refunds policy. However, you can cancel your subscription at any time, and you'll retain access until the end of your current billing period. We recommend using the 14-day free trial to ensure Jarvis AI meets your needs before subscribing.";
    }

    if (lowerMessage.includes("observatory") || lowerMessage.includes("business") || lowerMessage.includes("multiple")) {
      return "To add another Observatory (multi-business feature):\n\n1. Go to your dashboard\n2. Click on your Observatory name in the top navigation\n3. Select 'Add New Observatory' from the dropdown\n4. Name your new Observatory and configure its settings\n5. Connect the relevant integrations for this business\n\nNote: The multi-business feature is available on Professional and Enterprise plans. Each Observatory can have its own integrations and automation rules.";
    }

    if (lowerMessage.includes("price") || lowerMessage.includes("pricing") || lowerMessage.includes("cost")) {
      return "Jarvis AI pricing:\n\nStarter: $49/month - Perfect for solopreneurs\nProfessional: $149/month - For growing businesses\nEnterprise: Custom pricing - For large organizations\n\nAll plans include a 14-day free trial. Visit our pricing page for full feature comparison!";
    }

    if (lowerMessage.includes("integration") || lowerMessage.includes("connect")) {
      return "Jarvis AI integrates with:\n\n- iMessage\n- Email (Gmail, Outlook)\n- Twitter/X\n- SMS\n- HubSpot\n- Salesforce\n- Analytics platforms\n- DAWG AI\n\nYou can connect these in your Observatory dashboard under 'Integrations'. Each integration can be configured with custom automation rules.";
    }

    if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
      return "I can help you with:\n\n- Subscription and billing questions\n- Account management\n- Adding multiple Observatories\n- Integration setup\n- Feature explanations\n- Pricing information\n\nWhat specific question can I answer for you?";
    }

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
      return "Hello! How can I assist you with Jarvis AI today?";
    }

    // Default response
    return "I'm here to help! I can answer questions about:\n\n- Subscriptions and pricing\n- Account management\n- Adding multiple Observatories\n- Integrations and features\n- Refund policy\n\nCould you please rephrase your question or choose one of these topics?";
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Simulate typing delay for bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: getResponse(inputValue),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat bubble button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            zIndex: 1000,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(239, 68, 68, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(239, 68, 68, 0.4)";
          }}
        >
          💬
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 380,
            height: 600,
            maxHeight: "calc(100vh - 48px)",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px",
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Jarvis Support</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Always here to help</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 24,
                cursor: "pointer",
                padding: 4,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              background: "#f9fafb",
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent: message.isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: message.isUser
                      ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                      : "#fff",
                    color: message.isUser ? "#fff" : "#374151",
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: "pre-line",
                    boxShadow: message.isUser
                      ? "0 2px 8px rgba(239, 68, 68, 0.2)"
                      : "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: 20,
              borderTop: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                style={{
                  padding: "12px 20px",
                  borderRadius: 8,
                  background: inputValue.trim()
                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    : "#e5e7eb",
                  color: inputValue.trim() ? "#fff" : "#9ca3af",
                  border: "none",
                  cursor: inputValue.trim() ? "pointer" : "not-allowed",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
