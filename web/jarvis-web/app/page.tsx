"use client";

import React from "react";

type Msg = { role: "user" | "jarvis"; content: string };

export default function Home() {
  const API_URL = "/api/chat";

  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "jarvis",
      content:
        "Hey! I’m Jarvis. Ask me anything — or say ‘Hey Siri, Jarvis…’ on your phone to go hands‑free.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = String(
        data?.response ?? data?.data?.response ?? "(No response)"
      );

      // Simple streaming typing effect
      await typeIn(reply);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Jarvis chat error:', err);
      setMessages((cur) => [
        ...cur,
        { role: "jarvis", content: `Sorry — request failed: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function typeIn(full: string) {
    return new Promise<void>((resolve) => {
      let i = 0;
      const id = setInterval(() => {
        i += Math.max(1, Math.ceil(full.length / 80));
        if (i >= full.length) {
          setMessages((cur) => [...cur, { role: "jarvis", content: full }]);
          clearInterval(id);
          resolve();
        }
      }, 15);
    });
  }

  return (
    <main
      style={{
        display: "grid",
        gridTemplateRows: "64px 1fr auto",
        minHeight: "100vh",
        background: "#0b0b0f",
        color: "#f7f7fb",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, Apple Color Emoji, Segoe UI Emoji",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "#0b0f17",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "#4f46e5",
          }}
        />
        <strong style={{ fontWeight: 700 }}>Jarvis</strong>
        <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 13 }}>
          Voice: Auto
        </div>
      </header>

      {/* Messages */}
      <section
        style={{
          padding: 16,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: 720,
              background: m.role === "user" ? "#1f2937" : "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "10px 12px",
              borderRadius: 12,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
            }}
          >
            {m.content}
          </div>
        ))}
      </section>

      {/* Composer */}
      <form
        onSubmit={sendMessage}
        style={{
          display: "flex",
          gap: 8,
          padding: 12,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "#0b0f17",
          position: "sticky",
          bottom: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={loading ? "Jarvis is thinking…" : "Type a message"}
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "#0f1320",
            color: "#f7f7fb",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: loading ? "#374151" : "#4f46e5",
            color: "#fff",
            fontWeight: 600,
            border: 0,
            cursor: loading ? "default" : "pointer",
          }}
        >
          Send
        </button>
      </form>
    </main>
  );
}
