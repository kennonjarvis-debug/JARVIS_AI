import Link from "next/link";

export default function Home() {
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
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Jarvis</h1>
        <p style={{ opacity: 0.85, lineHeight: 1.5, marginBottom: 24 }}>
          Install the Siri Shortcut for Jarvis.
        </p>
        <Link
          href="/install"
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
          Go to Install
        </Link>
      </div>
    </main>
  );
}

