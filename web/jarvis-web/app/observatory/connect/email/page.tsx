"use client";

import ConnectionLayout from "../ConnectionLayout";

export default function EmailConnect() {
  const handleConnect = async () => {
    // Mock connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Email connected!");
  };

  return (
    <ConnectionLayout
      icon="📧"
      title="Email"
      description="Connect your Gmail account to let Jarvis manage your inbox intelligently. Jarvis can categorize emails, draft responses, schedule messages, and ensure important communications never get missed."
      permissions={[
        {
          icon: "📬",
          title: "Read Emails",
          description: "Access your inbox, sent items, and email threads",
        },
        {
          icon: "📤",
          title: "Send & Reply",
          description: "Send new emails and reply to messages on your behalf",
        },
        {
          icon: "🏷️",
          title: "Manage Labels",
          description: "Create, modify, and apply labels to organize your inbox",
        },
        {
          icon: "🗂️",
          title: "Organize Inbox",
          description: "Archive, delete, and move emails between folders",
        },
      ]}
      onConnect={handleConnect}
    />
  );
}
