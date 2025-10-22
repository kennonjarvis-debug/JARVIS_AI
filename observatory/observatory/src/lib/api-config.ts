/**
 * API Configuration Utility
 * Centralizes API base URLs and provides environment-aware configuration
 */

import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

/**
 * Get the JARVIS API base URL
 * Priority: Environment variable > Fallback to localhost
 */
export function getJarvisApiUrl(): string {
	if (browser) {
		// In browser, use environment variable or fallback
		return env.PUBLIC_JARVIS_API_URL || 'http://localhost:3000';
	}
	// Server-side
	return env.PUBLIC_JARVIS_API_URL || 'http://localhost:3000';
}

/**
 * Get the DAWG AI base URL
 * Priority: Environment variable > Fallback to localhost
 */
export function getDawgAiUrl(): string {
	if (browser) {
		return env.PUBLIC_DAWG_AI_URL || 'http://localhost:9000';
	}
	return env.PUBLIC_DAWG_AI_URL || 'http://localhost:9000';
}

/**
 * API client configuration
 */
export const apiConfig = {
	jarvis: getJarvisApiUrl(),
	dawg: getDawgAiUrl(),
	timeout: 30000, // 30 seconds
};

/**
 * Fetch wrapper with error handling
 */
export async function apiFetch(url: string, options?: RequestInit) {
	try {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options?.headers,
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	} catch (error: any) {
		console.error('API fetch error:', error);
		throw new Error(error.message || 'Failed to fetch data');
	}
}
