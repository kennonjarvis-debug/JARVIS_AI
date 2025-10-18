-- Add Social Listening System Tables
-- This adds new tables without modifying existing ones

-- Discovered posts from social platforms
CREATE TABLE IF NOT EXISTS "SocialListeningPost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorUsername" TEXT NOT NULL,
  "authorDisplayName" TEXT NOT NULL,
  "authorFollowers" INTEGER,
  "authorVerified" BOOLEAN NOT NULL DEFAULT false,
  "authorBio" TEXT,
  "authorLocation" TEXT,
  "content" TEXT NOT NULL,
  "detectedIntents" JSONB NOT NULL,
  "primaryIntent" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "qualityScore" DOUBLE PRECISION NOT NULL,
  "engagementLikes" INTEGER NOT NULL DEFAULT 0,
  "engagementRetweets" INTEGER NOT NULL DEFAULT 0,
  "engagementReplies" INTEGER NOT NULL DEFAULT 0,
  "engagementViews" INTEGER,
  "postUrl" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'en',
  "hashtags" JSONB,
  "mentions" JSONB,
  "mediaUrls" JSONB,
  "postedAt" TIMESTAMP(3) NOT NULL,
  "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "SocialListeningPost_platform_externalId_key" UNIQUE ("platform", "externalId")
);

CREATE INDEX IF NOT EXISTS "SocialListeningPost_userId_idx" ON "SocialListeningPost"("userId");
CREATE INDEX IF NOT EXISTS "SocialListeningPost_platform_idx" ON "SocialListeningPost"("platform");
CREATE INDEX IF NOT EXISTS "SocialListeningPost_primaryIntent_idx" ON "SocialListeningPost"("primaryIntent");
CREATE INDEX IF NOT EXISTS "SocialListeningPost_qualityScore_idx" ON "SocialListeningPost"("qualityScore");
CREATE INDEX IF NOT EXISTS "SocialListeningPost_discoveredAt_idx" ON "SocialListeningPost"("discoveredAt");
CREATE INDEX IF NOT EXISTS "SocialListeningPost_userId_platform_idx" ON "SocialListeningPost"("userId", "platform");
CREATE INDEX IF NOT EXISTS "SocialListeningPost_userId_processed_idx" ON "SocialListeningPost"("userId", "processed");

-- Generated responses for social posts
CREATE TABLE IF NOT EXISTS "SocialListeningResponse" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "responseText" TEXT NOT NULL,
  "qualityScore" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectedBy" TEXT,
  "rejectionReason" TEXT,
  "postedAt" TIMESTAMP(3),
  "scheduledFor" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "SocialListeningResponse_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialListeningPost"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SocialListeningResponse_postId_idx" ON "SocialListeningResponse"("postId");
CREATE INDEX IF NOT EXISTS "SocialListeningResponse_userId_idx" ON "SocialListeningResponse"("userId");
CREATE INDEX IF NOT EXISTS "SocialListeningResponse_status_idx" ON "SocialListeningResponse"("status");
CREATE INDEX IF NOT EXISTS "SocialListeningResponse_scheduledFor_idx" ON "SocialListeningResponse"("scheduledFor");
CREATE INDEX IF NOT EXISTS "SocialListeningResponse_userId_status_idx" ON "SocialListeningResponse"("userId", "status");

-- Actual engagements made on social platforms
CREATE TABLE IF NOT EXISTS "SocialListeningEngagement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "responseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "engagementType" TEXT NOT NULL,
  "externalId" TEXT,
  "success" BOOLEAN NOT NULL,
  "error" TEXT,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "likesReceived" INTEGER,
  "repliesReceived" INTEGER,
  "retweetsReceived" INTEGER,
  "viewsReceived" INTEGER,
  "authorReplied" BOOLEAN NOT NULL DEFAULT false,
  "conversationStarted" BOOLEAN NOT NULL DEFAULT false,
  "leadGenerated" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  CONSTRAINT "SocialListeningEngagement_responseId_key" UNIQUE ("responseId"),
  CONSTRAINT "SocialListeningEngagement_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialListeningPost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SocialListeningEngagement_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SocialListeningResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SocialListeningEngagement_postId_idx" ON "SocialListeningEngagement"("postId");
CREATE INDEX IF NOT EXISTS "SocialListeningEngagement_responseId_idx" ON "SocialListeningEngagement"("responseId");
CREATE INDEX IF NOT EXISTS "SocialListeningEngagement_userId_idx" ON "SocialListeningEngagement"("userId");
CREATE INDEX IF NOT EXISTS "SocialListeningEngagement_platform_idx" ON "SocialListeningEngagement"("platform");
CREATE INDEX IF NOT EXISTS "SocialListeningEngagement_engagementType_idx" ON "SocialListeningEngagement"("engagementType");
CREATE INDEX IF NOT EXISTS "SocialListeningEngagement_performedAt_idx" ON "SocialListeningEngagement"("performedAt");
CREATE INDEX IF NOT EXISTS "SocialListeningEngagement_userId_success_idx" ON "SocialListeningEngagement"("userId", "success");

-- Social listening analytics and performance tracking
CREATE TABLE IF NOT EXISTS "SocialListeningAnalytics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "metricType" TEXT NOT NULL,
  "metricValue" DOUBLE PRECISION NOT NULL,
  "dimension1" TEXT,
  "dimension2" TEXT,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SocialListeningAnalytics_userId_idx" ON "SocialListeningAnalytics"("userId");
CREATE INDEX IF NOT EXISTS "SocialListeningAnalytics_platform_idx" ON "SocialListeningAnalytics"("platform");
CREATE INDEX IF NOT EXISTS "SocialListeningAnalytics_metricType_idx" ON "SocialListeningAnalytics"("metricType");
CREATE INDEX IF NOT EXISTS "SocialListeningAnalytics_timestamp_idx" ON "SocialListeningAnalytics"("timestamp");
CREATE INDEX IF NOT EXISTS "SocialListeningAnalytics_userId_platform_timestamp_idx" ON "SocialListeningAnalytics"("userId", "platform", "timestamp");

-- Social listening configuration per user
CREATE TABLE IF NOT EXISTS "SocialListeningConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "platforms" JSONB NOT NULL,
  "scanInterval" INTEGER NOT NULL DEFAULT 15,
  "maxPostsPerScan" INTEGER NOT NULL DEFAULT 20,
  "minQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
  "autoEngageEnabled" BOOLEAN NOT NULL DEFAULT false,
  "requireApproval" BOOLEAN NOT NULL DEFAULT true,
  "enabledIntents" JSONB NOT NULL,
  "customKeywords" JSONB,
  "excludedAuthors" JSONB,
  "minAuthorFollowers" INTEGER,
  "maxResponseDelay" INTEGER NOT NULL DEFAULT 30,
  "dailyEngagementLimit" INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialListeningConfig_userId_key" UNIQUE ("userId")
);

CREATE INDEX IF NOT EXISTS "SocialListeningConfig_userId_idx" ON "SocialListeningConfig"("userId");
