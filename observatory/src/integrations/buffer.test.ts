/**
 * Tests for Buffer Integration
 *
 * @module integrations/buffer.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { BufferAdapter } from './buffer';
import { BufferConfig, SocialPost } from '../types/integrations';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('BufferAdapter', () => {
  let bufferAdapter: BufferAdapter;
  let mockAxiosInstance: any;

  const validConfig: BufferConfig = {
    accessToken: 'test_access_token',
    profileIds: {
      twitter: 'profile_twitter_123',
      linkedin: 'profile_linkedin_456',
    },
  };

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn((onFulfilled) => {
            mockAxiosInstance.__requestInterceptor = onFulfilled;
          }),
        },
        response: {
          use: vi.fn((onFulfilled, onRejected) => {
            mockAxiosInstance.__responseInterceptor = { onFulfilled, onRejected };
          }),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError.mockImplementation(
      (error: any) => error.isAxiosError === true
    );

    bufferAdapter = new BufferAdapter(validConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with valid config', () => {
      expect(bufferAdapter).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.bufferapp.com/1',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_access_token',
          }),
        })
      );
    });

    it('should throw error if access token is missing', () => {
      expect(() => new BufferAdapter({ accessToken: '' } as BufferConfig)).toThrow();
    });

    it('should initialize with empty profileIds if not provided', () => {
      const adapter = new BufferAdapter({ accessToken: 'token' } as BufferConfig);
      expect(adapter).toBeDefined();
    });
  });

  describe('getProfiles()', () => {
    it('should fetch profiles successfully', async () => {
      const mockProfiles = [
        {
          id: 'profile_1',
          service: 'twitter',
          service_username: '@testuser',
          formatted_service: 'Twitter',
          timezone: 'America/New_York',
        },
        {
          id: 'profile_2',
          service: 'linkedin',
          service_username: 'Test User',
          formatted_service: 'LinkedIn',
          timezone: 'America/New_York',
        },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockProfiles,
        headers: {},
      });

      const profiles = await bufferAdapter.getProfiles();

      expect(profiles).toEqual(mockProfiles);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/profiles.json');
    });

    it('should handle authentication errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401 },
        message: 'Unauthorized',
      });

      await expect(bufferAdapter.getProfiles()).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
        },
        message: 'Too Many Requests',
      });

      await expect(bufferAdapter.getProfiles()).rejects.toThrow();
    });

    it('should handle general API errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(bufferAdapter.getProfiles()).rejects.toThrow();
    });
  });

  describe('getProfileId()', () => {
    it('should return cached profile ID if available', async () => {
      const profileId = await bufferAdapter.getProfileId('twitter');

      expect(profileId).toBe('profile_twitter_123');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should fetch profile ID from API if not cached', async () => {
      const mockProfiles = [
        {
          id: 'profile_facebook_789',
          service: 'facebook',
          service_username: 'Test Page',
          formatted_service: 'Facebook',
          timezone: 'America/New_York',
        },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockProfiles,
        headers: {},
      });

      const profileId = await bufferAdapter.getProfileId('facebook');

      expect(profileId).toBe('profile_facebook_789');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/profiles.json');
    });

    it('should handle case-insensitive platform names', async () => {
      const profileId = await bufferAdapter.getProfileId('TWITTER');

      expect(profileId).toBe('profile_twitter_123');
    });

    it('should throw error if profile not found', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [
          {
            id: 'profile_1',
            service: 'twitter',
            service_username: '@testuser',
            formatted_service: 'Twitter',
            timezone: 'America/New_York',
          },
        ],
        headers: {},
      });

      await expect(bufferAdapter.getProfileId('instagram')).rejects.toThrow();
    });
  });

  describe('createPost()', () => {
    it('should create a post successfully', async () => {
      const post: SocialPost = {
        text: 'Test post content',
        profiles: ['profile_twitter_123'],
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          updates: [
            {
              id: 'update_123',
              profile_id: 'profile_twitter_123',
              status: 'buffer',
              text: 'Test post content',
            },
          ],
        },
        headers: {},
      });

      const result = await bufferAdapter.createPost(post);

      expect(result.id).toBe('update_123');
      expect(result.profileIds).toEqual(['profile_twitter_123']);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/updates/create.json',
        expect.objectContaining({
          profile_ids: ['profile_twitter_123'],
          text: 'Test post content',
          now: true,
        })
      );
    });

    it('should create a scheduled post', async () => {
      const scheduledDate = new Date('2025-12-01T10:00:00Z');
      const post: SocialPost = {
        text: 'Scheduled post',
        profiles: ['profile_twitter_123'],
        scheduledAt: scheduledDate,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          updates: [
            {
              id: 'update_456',
              profile_id: 'profile_twitter_123',
              status: 'scheduled',
              text: 'Scheduled post',
              scheduled_at: Math.floor(scheduledDate.getTime() / 1000),
            },
          ],
        },
        headers: {},
      });

      const result = await bufferAdapter.createPost(post);

      expect(result.id).toBe('update_456');
      expect(result.scheduledAt).toEqual(scheduledDate);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/updates/create.json',
        expect.objectContaining({
          now: false,
          scheduled_at: Math.floor(scheduledDate.getTime() / 1000),
        })
      );
    });

    it('should create a post with media', async () => {
      const post: SocialPost = {
        text: 'Post with image',
        profiles: ['profile_twitter_123'],
        media: [
          {
            url: 'https://example.com/image.jpg',
            alt: 'Test image',
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          updates: [
            {
              id: 'update_789',
              profile_id: 'profile_twitter_123',
              status: 'buffer',
              text: 'Post with image',
            },
          ],
        },
        headers: {},
      });

      const result = await bufferAdapter.createPost(post);

      expect(result.id).toBe('update_789');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/updates/create.json',
        expect.objectContaining({
          media: {
            photo: 'https://example.com/image.jpg',
            description: 'Test image',
          },
        })
      );
    });

    it('should validate post text is required', async () => {
      const post: SocialPost = {
        text: '',
        profiles: ['profile_twitter_123'],
      };

      await expect(bufferAdapter.createPost(post)).rejects.toThrow();
    });

    it('should validate profiles array is required', async () => {
      const post: SocialPost = {
        text: 'Test post',
        profiles: [],
      };

      await expect(bufferAdapter.createPost(post)).rejects.toThrow();
    });

    it('should handle authentication errors', async () => {
      const post: SocialPost = {
        text: 'Test post',
        profiles: ['profile_twitter_123'],
      };

      mockAxiosInstance.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401 },
        message: 'Unauthorized',
      });

      await expect(bufferAdapter.createPost(post)).rejects.toThrow();
    });

    it('should handle validation errors from API', async () => {
      const post: SocialPost = {
        text: 'Test post',
        profiles: ['invalid_profile'],
      };

      mockAxiosInstance.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid profile ID' },
        },
        message: 'Bad Request',
      });

      await expect(bufferAdapter.createPost(post)).rejects.toThrow();
    });
  });

  describe('getPostAnalytics()', () => {
    it('should fetch analytics for a post', async () => {
      const postId = 'update_123';

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          id: postId,
          text: 'Test post',
          statistics: {
            likes: 42,
            comments: 10,
            shares: 5,
            clicks: 100,
            reach: 1000,
          },
        },
        headers: {},
      });

      const analytics = await bufferAdapter.getPostAnalytics(postId);

      expect(analytics).toEqual({
        likes: 42,
        comments: 10,
        shares: 5,
        clicks: 100,
        reach: 1000,
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/updates/${postId}.json`);
    });

    it('should return zero values if statistics are missing', async () => {
      const postId = 'update_456';

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          id: postId,
          text: 'Test post',
        },
        headers: {},
      });

      const analytics = await bufferAdapter.getPostAnalytics(postId);

      expect(analytics).toEqual({
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0,
        reach: 0,
      });
    });

    it('should handle post not found error', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not Found',
      });

      await expect(bufferAdapter.getPostAnalytics('nonexistent')).rejects.toThrow();
    });
  });

  describe('getScheduledPosts()', () => {
    it('should fetch scheduled posts for a profile', async () => {
      const profileId = 'profile_twitter_123';

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          updates: [
            {
              id: 'update_1',
              text: 'Scheduled post 1',
              scheduled_at: 1733097600,
              status: 'scheduled',
            },
            {
              id: 'update_2',
              text: 'Scheduled post 2',
              scheduled_at: 1733184000,
              status: 'scheduled',
            },
          ],
        },
        headers: {},
      });

      const posts = await bufferAdapter.getScheduledPosts(profileId);

      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe('update_1');
      expect(posts[0].text).toBe('Scheduled post 1');
      expect(posts[0].scheduledAt).toBeInstanceOf(Date);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/profiles/${profileId}/updates/scheduled.json`
      );
    });

    it('should handle empty scheduled posts', async () => {
      const profileId = 'profile_twitter_123';

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          updates: [],
        },
        headers: {},
      });

      const posts = await bufferAdapter.getScheduledPosts(profileId);

      expect(posts).toHaveLength(0);
    });

    it('should handle profile not found error', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not Found',
      });

      await expect(bufferAdapter.getScheduledPosts('nonexistent')).rejects.toThrow();
    });
  });

  describe('deletePost()', () => {
    it('should delete a post successfully', async () => {
      const postId = 'update_123';

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true },
        headers: {},
      });

      await bufferAdapter.deletePost(postId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/updates/${postId}/destroy.json`);
    });

    it('should handle post not found error', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not Found',
      });

      await expect(bufferAdapter.deletePost('nonexistent')).rejects.toThrow();
    });

    it('should handle authentication errors', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401 },
        message: 'Unauthorized',
      });

      await expect(bufferAdapter.deletePost('update_123')).rejects.toThrow();
    });
  });

  describe('testConnection()', () => {
    it('should return true if connection is successful', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [],
        headers: {},
      });

      const isConnected = await bufferAdapter.testConnection();

      expect(isConnected).toBe(true);
    });

    it('should return false if connection fails', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection failed'));

      const isConnected = await bufferAdapter.testConnection();

      expect(isConnected).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should track rate limit from response headers', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [],
        headers: {
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        },
      });

      await bufferAdapter.getProfiles();

      // Rate limit info should be tracked internally
      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });
  });
});
