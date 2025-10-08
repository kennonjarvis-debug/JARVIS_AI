"use client";

import React from "react";

const InstallPage: React.FC = () => {
  const host =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_FALLBACK_URL;
  const preferred = `${host}/Jarvis.shortcut`;
  const [shortcutUrl, setShortcutUrl] = React.useState(preferred);
  const [error, setError] = React.useState<string | null>(null);
  const installUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(
    shortcutUrl
  )}`;

  React.useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const res = await fetch(preferred, { method: "HEAD" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (alive) setShortcutUrl(preferred);
      } catch (e) {
        const fallback = "https://jarvis-web-pi.vercel.app/Jarvis.shortcut";
        // Try fallback host
        try {
          const r2 = await fetch(fallback, { method: "HEAD" });
          if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
          if (alive) setShortcutUrl(fallback);
        } catch (e2) {
          if (alive)
            setError(
              "Shortcut file is unreachable right now. Please try again later."
            );
        }
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [preferred]);

  return (
    <main style={{
      display: "flex",
      minHeight: "100vh",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "#0b0b0f",
      color: "#f7f7fb",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, Apple Color Emoji, Segoe UI Emoji"
    }}>
      <div style={{ maxWidth: 720, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
          Install Jarvis Siri Shortcut
        </h1>
        <p style={{ opacity: 0.85, lineHeight: 1.5, marginBottom: 24 }}>
          Tap the button below to add the Jarvis Siri Shortcut to your iPhone or Mac. 
          Make sure you have the Shortcuts app installed.
        </p>

        <a
          href={installUrl}
          style={{
            display: "inline-block",
            padding: "12px 18px",
            borderRadius: 10,
            background: "#4f46e5",
            color: "white",
            fontWeight: 600,
            textDecoration: "none"
          }}
        >
          Add to Shortcuts
        </a>

        <div style={{ marginTop: 16 }}>
          <a
            href={installUrl}
            style={{ color: "#a5b4fc", textDecoration: "underline" }}
          >
            Having trouble? Tap here to open Shortcuts
          </a>
          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
            Deep link target: {installUrl}
          </p>
          {error && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#fca5a5" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
};

export default InstallPage;
