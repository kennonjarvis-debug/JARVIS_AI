"use client";

import ConnectionLayout from "../ConnectionLayout";

export default function HubSpotConnect() {
  const handleConnect = async () => {
    // Mock connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("HubSpot connected!");
  };

  return (
    <ConnectionLayout
      icon="🟠"
      title="HubSpot"
      description="Connect your HubSpot account to automate marketing, sales, and customer service. Jarvis can manage campaigns, nurture leads, track customer interactions, and optimize your marketing funnel."
      permissions={[
        {
          icon: "📧",
          title: "Marketing Automation",
          description: "Manage email campaigns, workflows, and lead nurturing",
        },
        {
          icon: "👥",
          title: "Contact Management",
          description: "Access and update contact database and segmentation",
        },
        {
          icon: "📈",
          title: "Analytics & Reports",
          description: "View marketing performance and conversion metrics",
        },
        {
          icon: "💬",
          title: "Conversations",
          description: "Manage live chat, chatbot, and customer communications",
        },
      ]}
      onConnect={handleConnect}
    />
  );
}
