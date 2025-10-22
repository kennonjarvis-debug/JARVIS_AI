"use client";

import ConnectionLayout from "../ConnectionLayout";

export default function iMessageConnect() {
  const handleConnect = async () => {
    // Mock connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("iMessage connected!");
  };

  return (
    <ConnectionLayout
      icon="💬"
      title="iMessage"
      description="Enable Jarvis to read and respond to your iMessages intelligently. Jarvis can help filter spam, prioritize important messages, draft responses, and keep you connected while you focus on what matters."
      permissions={[
        {
          icon: "📱",
          title: "Read Messages",
          description: "Access incoming and existing iMessages to understand context",
        },
        {
          icon: "✉️",
          title: "Send Messages",
          description: "Send responses on your behalf based on your preferences",
        },
        {
          icon: "🔔",
          title: "Manage Notifications",
          description: "Smart filtering and prioritization of message notifications",
        },
        {
          icon: "📋",
          title: "Access Contacts",
          description: "Read contact information to personalize responses",
        },
      ]}
      onConnect={handleConnect}
    />
  );
}
