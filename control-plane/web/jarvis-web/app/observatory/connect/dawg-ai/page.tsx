"use client";

import ConnectionLayout from "../ConnectionLayout";

export default function DawgAIConnect() {
  const handleConnect = async () => {
    // Mock connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // In production, this would initiate OAuth flow
    console.log("DAWG AI connected!");
  };

  return (
    <ConnectionLayout
      icon="💼"
      title="DAWG AI"
      description="Connect your DAWG AI music production platform to enable Jarvis to automate your creative workflow. Jarvis can help manage projects, collaborate with artists, and streamline your music production process."
      permissions={[
        {
          icon: "🎵",
          title: "Read Project Data",
          description: "View your music projects, tracks, and collaborations",
        },
        {
          icon: "✍️",
          title: "Manage Projects",
          description: "Create, update, and organize music projects on your behalf",
        },
        {
          icon: "👥",
          title: "Access Collaborations",
          description: "View and manage collaborator permissions and contributions",
        },
        {
          icon: "📊",
          title: "Analytics Access",
          description: "Read analytics and insights about your music production",
        },
      ]}
      onConnect={handleConnect}
    />
  );
}
