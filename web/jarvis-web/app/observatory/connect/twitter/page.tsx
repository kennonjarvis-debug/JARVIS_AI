"use client";

import ConnectionLayout from "../ConnectionLayout";

export default function TwitterConnect() {
  const handleConnect = async () => {
    // Mock connection process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Twitter/X connected!");
  };

  return (
    <ConnectionLayout
      icon="🐦"
      title="Twitter/X"
      description="Connect your Twitter/X account to automate your social media presence. Jarvis can schedule posts, engage with followers, monitor mentions, and help grow your audience with intelligent content strategies."
      permissions={[
        {
          icon: "✍️",
          title: "Post Tweets",
          description: "Create and publish tweets, threads, and replies",
        },
        {
          icon: "❤️",
          title: "Engage with Content",
          description: "Like, retweet, and reply to posts on your behalf",
        },
        {
          icon: "📊",
          title: "Analytics Access",
          description: "View engagement metrics and audience insights",
        },
        {
          icon: "💬",
          title: "Direct Messages",
          description: "Read and respond to DMs to maintain relationships",
        },
      ]}
      onConnect={handleConnect}
    />
  );
}
