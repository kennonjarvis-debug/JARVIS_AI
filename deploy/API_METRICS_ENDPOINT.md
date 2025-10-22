# Twitter Metrics API Endpoint

## Endpoint

```
GET /api/integrations/:integration_id/metrics
```

## Description

Fetches live Twitter account metrics and recent tweet engagement data in real-time using Twitter API v2.

## Authentication

Requires JWT authentication token from Supabase.

```
Authorization: Bearer <jwt_token>
```

## Parameters

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `integration_id` | UUID | Yes | The ID of the Twitter integration from the database |

## Response

### Success Response (200 OK)

```json
{
  "integration_id": "d66d0922-a735-4ea5-bd70-daef059e392c",
  "platform": "twitter",
  "account": {
    "id": "1234567890",
    "username": "YourHandle",
    "name": "Your Display Name",
    "profile_image_url": "https://pbs.twimg.com/profile_images/...",
    "description": "Your bio text",
    "verified": false
  },
  "metrics": {
    "followers_count": 1234,
    "following_count": 567,
    "tweet_count": 8901,
    "listed_count": 12
  },
  "engagement": {
    "engagement_rate": 2.45,
    "average_engagement_per_tweet": 25,
    "average_impressions_per_tweet": 1000,
    "total_engagement_last_10_tweets": 250,
    "total_impressions_last_10_tweets": 10000
  },
  "recent_tweets": [
    {
      "id": "1234567890123456789",
      "text": "Your tweet content (truncated to 100 chars if longer)...",
      "created_at": "2025-10-19T12:00:00.000Z",
      "metrics": {
        "likes": 10,
        "retweets": 5,
        "replies": 3,
        "quotes": 1,
        "impressions": 500,
        "engagement_rate": "3.80"
      }
    }
  ],
  "fetched_at": "2025-10-19T12:30:00.000Z"
}
```

### Error Responses

#### 401 Unauthorized - Missing/Invalid Token

```json
{
  "error": "Missing authorization token"
}
```

#### 401 Unauthorized - Twitter Token Expired

```json
{
  "error": "Authentication failed",
  "message": "Twitter access token may be expired. Please reconnect your account.",
  "needs_reconnect": true
}
```

#### 404 Not Found - Integration Not Found

```json
{
  "error": "Integration not found",
  "message": "The requested integration does not exist"
}
```

#### 400 Bad Request - Unsupported Platform

```json
{
  "error": "Unsupported platform",
  "message": "Live metrics are not yet available for gmail"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Failed to fetch metrics",
  "message": "Error description"
}
```

## Response Fields

### Account Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Twitter user ID |
| `username` | string | Twitter handle (without @) |
| `name` | string | Display name |
| `profile_image_url` | string | URL to profile picture |
| `description` | string | User bio |
| `verified` | boolean | Verification status (blue checkmark) |

### Metrics Object

| Field | Type | Description |
|-------|------|-------------|
| `followers_count` | number | Total followers |
| `following_count` | number | Total accounts following |
| `tweet_count` | number | Total tweets ever posted |
| `listed_count` | number | Number of lists user appears on |

### Engagement Object

| Field | Type | Description |
|-------|------|-------------|
| `engagement_rate` | number | Overall engagement rate (%) based on last 10 tweets |
| `average_engagement_per_tweet` | number | Average total engagement (likes + RTs + replies + quotes) |
| `average_impressions_per_tweet` | number | Average impressions across tweets with impression data |
| `total_engagement_last_10_tweets` | number | Sum of all engagement on last 10 tweets |
| `total_impressions_last_10_tweets` | number | Sum of all impressions on last 10 tweets |

### Recent Tweet Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Tweet ID |
| `text` | string | Tweet text (truncated to 100 chars) |
| `created_at` | string | ISO 8601 timestamp |
| `metrics.likes` | number | Like count |
| `metrics.retweets` | number | Retweet count |
| `metrics.replies` | number | Reply count |
| `metrics.quotes` | number | Quote tweet count |
| `metrics.impressions` | number | Impression count (requires elevated API) |
| `metrics.engagement_rate` | string | Individual tweet engagement rate (%) |

## Usage Examples

### cURL

```bash
curl -X GET "https://api.jarvis.ai/api/integrations/d66d0922-a735-4ea5-bd70-daef059e392c/metrics" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### JavaScript/TypeScript

```typescript
async function getTwitterMetrics(integrationId: string, authToken: string) {
  const response = await fetch(
    `https://api.jarvis.ai/api/integrations/${integrationId}/metrics`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch metrics');
  }

  return await response.json();
}

// Usage
const metrics = await getTwitterMetrics('integration-uuid', 'jwt-token');
console.log(`Followers: ${metrics.metrics.followers_count}`);
console.log(`Engagement Rate: ${metrics.engagement.engagement_rate}%`);
```

### React Hook

```typescript
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

function useTwitterMetrics(integrationId: string) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);

        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(
          `${process.env.VITE_API_URL}/api/integrations/${integrationId}/metrics`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message);
        }

        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();

    // Refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [integrationId]);

  return { metrics, loading, error };
}

// Usage in component
function TwitterDashboard({ integrationId }) {
  const { metrics, loading, error } = useTwitterMetrics(integrationId);

  if (loading) return <div>Loading metrics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!metrics) return null;

  return (
    <div>
      <h2>@{metrics.account.username}</h2>
      <p>Followers: {metrics.metrics.followers_count.toLocaleString()}</p>
      <p>Engagement Rate: {metrics.engagement.engagement_rate}%</p>
    </div>
  );
}
```

## Rate Limits

This endpoint is subject to Twitter API v2 rate limits:

- **User lookup**: 900 requests per 15-minute window
- **User timeline**: 1,500 requests per 15-minute window

**Best Practice**: Cache results on the frontend for 5-15 minutes to avoid hitting rate limits.

## Requirements

### Twitter API Access

- **Essential Access** (Free): Provides basic metrics
- **Elevated Access** (Approval required): Provides impression counts
  - Without elevated access, `impression_count` will be 0
  - Apply at: https://developer.twitter.com/en/portal/petition/elevated

### Database

Integration must exist in `integrations` table with:
- Valid `integration_id`
- `platform` set to `'twitter'`
- Valid OAuth credentials in `credentials` field:
  ```json
  {
    "api_key": "...",
    "api_secret": "...",
    "access_token": "...",
    "access_token_secret": "..."
  }
  ```

## Performance

- **Average Response Time**: 500-1300ms
  - Profile fetch: ~200-500ms
  - Timeline fetch: ~300-800ms

- **Caching**: Not currently cached (implement on frontend)

## Security

- ✅ Requires valid JWT authentication
- ✅ Validates integration ownership via Supabase RLS
- ✅ Credentials never exposed in response
- ✅ OAuth tokens stored encrypted

## Error Handling

The endpoint handles these error scenarios:

1. **Missing authentication** → 401
2. **Integration not found** → 404
3. **Wrong platform** → 400
4. **Expired Twitter token** → 401 with `needs_reconnect: true`
5. **Twitter API error** → 500 with error message
6. **Network error** → 500 with error message

## Changelog

### v1.0.0 - 2025-10-19
- Initial implementation
- Supports Twitter metrics only
- Live data from Twitter API v2
- Engagement rate calculation
- Recent tweets with metrics
- Comprehensive error handling

## Support

For issues or questions:
- Check logs for detailed error messages
- Verify Twitter API credentials are valid
- Ensure elevated API access if impressions are needed
- Check Supabase connection and RLS policies
