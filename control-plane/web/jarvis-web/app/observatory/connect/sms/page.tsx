"use client";

import ConnectionLayout from "../ConnectionLayout";

export default function SMSConnect() {
  const handleConnect = async () => {
    // Mock connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("SMS connected!");
  };

  return (
    <ConnectionLayout
      icon="📱"
      title="SMS"
      description="Enable Jarvis to manage your SMS and text messaging. Perfect for business communications, customer notifications, appointment reminders, and staying connected with clients through text messages."
      permissions={[
        {
          icon: "📩",
          title: "Read Messages",
          description: "Access incoming SMS to understand context and respond appropriately",
        },
        {
          icon: "📤",
          title: "Send SMS",
          description: "Send text messages on your behalf to customers and contacts",
        },
        {
          icon: "📞",
          title: "Phone Number Access",
          description: "Use your registered phone numbers for sending messages",
        },
        {
          icon: "🔔",
          title: "Notification Control",
          description: "Manage SMS notifications and delivery reports",
        },
      ]}
      onConnect={handleConnect}
    />
  );
}
