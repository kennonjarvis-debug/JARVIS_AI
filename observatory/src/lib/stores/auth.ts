/**
 * Authentication Store
 * Manages user authentication state for Observatory
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface AuthState {
	isAuthenticated: boolean;
	username: string | null;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		isAuthenticated: false,
		username: null,
	});

	return {
		subscribe,
		login: (username: string) => {
			if (browser) {
				// Store in session storage
				sessionStorage.setItem('jarvis_auth', JSON.stringify({ username }));
			}
			set({ isAuthenticated: true, username });
		},
		logout: () => {
			if (browser) {
				sessionStorage.removeItem('jarvis_auth');
			}
			set({ isAuthenticated: false, username: null });
		},
		checkAuth: () => {
			if (browser) {
				const stored = sessionStorage.getItem('jarvis_auth');
				if (stored) {
					try {
						const { username } = JSON.parse(stored);
						set({ isAuthenticated: true, username });
						return true;
					} catch (e) {
						console.error('Failed to parse auth data:', e);
					}
				}
			}
			return false;
		},
	};
}

export const authStore = createAuthStore();
