"use client";

import ConnectionLayout from "../ConnectionLayout";

export default function AnalyticsConnect() {
  const handleConnect = async () => {
    // Mock connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Analytics connected!");
  };

  return (
    <ConnectionLayout
      icon="📊"
      title="Analytics"
      description="Connect your analytics platforms (Google Analytics, Mixpanel, etc.) to gain AI-powered insights into your business performance. Jarvis can identify trends, anomalies, and opportunities in your data automatically."
      permissions={[
        {
          icon: "📈",
          title: "Read Analytics Data",
          description: "Access traffic, conversions, and user behavior data",
        },
        {
          icon: "🎯",
          title: "Event Tracking",
          description: "View custom events and goal completions",
        },
        {
          icon: "👥",
          title: "Audience Insights",
          description: "Access demographic and behavioral segmentation data",
        },
        {
          icon: "📋",
          title: "Report Generation",
          description: "Create automated reports and performance summaries",
        },
      ]}
      onConnect={handleConnect}
    />
  );
}
