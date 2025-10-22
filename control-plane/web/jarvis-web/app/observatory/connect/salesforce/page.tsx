"use client";

import ConnectionLayout from "../ConnectionLayout";

export default function SalesforceConnect() {
  const handleConnect = async () => {
    // Mock connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Salesforce connected!");
  };

  return (
    <ConnectionLayout
      icon="🔷"
      title="Salesforce"
      description="Integrate your Salesforce CRM to automate sales processes and customer relationship management. Jarvis can update records, track leads, manage opportunities, and provide intelligent insights into your sales pipeline."
      permissions={[
        {
          icon: "👤",
          title: "Access CRM Data",
          description: "Read contacts, leads, accounts, and opportunities",
        },
        {
          icon: "✏️",
          title: "Update Records",
          description: "Create and modify CRM records based on interactions",
        },
        {
          icon: "📊",
          title: "View Analytics",
          description: "Access reports, dashboards, and sales metrics",
        },
        {
          icon: "🔔",
          title: "Task Management",
          description: "Create tasks, events, and follow-ups automatically",
        },
      ]}
      onConnect={handleConnect}
    />
  );
}
