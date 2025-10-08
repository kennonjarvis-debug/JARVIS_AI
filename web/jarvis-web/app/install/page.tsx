"use client";

import React from "react";

const InstallPage: React.FC = () => {
  const installUrl =
    "shortcuts://import-shortcut?url=https://jarvis-ai-web.vercel.app/Jarvis.shortcut";

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

        <p style={{ marginTop: 16, fontSize: 12, opacity: 0.65 }}>
          Deep link target: {installUrl}
        </p>
      </div>
    </main>
  );
};

export default InstallPage;

